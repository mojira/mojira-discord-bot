import { APIContainerComponent, DiscordAPIError, MessageFlags, RESTJSONErrorCodes, SendableChannels, Snowflake, SnowflakeUtil } from 'discord.js';
import log4js from 'log4js';
import BotConfig, { ReleaseFeedConfig } from '../BotConfig.js';
import { NewsUtil } from '../util/NewsUtil.js';
import { JavaReleases } from '../util/releasefeed/JavaReleases.js';
import { Release } from '../util/releasefeed/Release.js';
import { ReleaseFeedUtil } from '../util/releasefeed/ReleaseFeedUtil.js';
import { SlicedlimeVideos, Videos } from '../util/releasefeed/SlicedlimeVideos.js';
import Task from './Task.js';

export default class ReleaseFeedTask extends Task {
	private static logger = log4js.getLogger( 'ReleaseFeedTask' );

	private readonly maxVideoWait = 14 * 24 * 60 * 60 * 1000;

	private readonly config: ReleaseFeedConfig;
	private readonly channel: SendableChannels;
	private readonly java: JavaReleases;

	constructor( config: ReleaseFeedConfig, channel: SendableChannels ) {
		super();

		this.config = config;
		this.channel = channel;
		this.java = new JavaReleases( config );
	}

	/**
	 * Creates table of claimed and posted releases
	 */
	protected async init(): Promise<void> {
		BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS release_feed (\'release\' varchar, \'message\' varchar, \'version\' varchar)' );
		BotConfig.database.exec( 'CREATE UNIQUE INDEX IF NOT EXISTS release_feed_release ON release_feed (release)' );
	}

	/**
	 * Checks for new releases and videos
	 */
	protected async run(): Promise<void> {
		try {
			await this.postReleases( 'java', await this.java.getReleases() );
		} catch ( error ) {
			ReleaseFeedTask.logger.error( `[${ this.id }] Could not check java releases`, error );
		}

		try {
			await this.linkVideos();
		} catch ( error ) {
			ReleaseFeedTask.logger.error( `[${ this.id }] Could not check videos`, error );
		}
	}

	/**
	 * Posts releases not posted yet, oldest first, while first check of source only remembers them
	 */
	private async postReleases( source: string, releases: Release[] ): Promise<void> {
		const known = new Set( BotConfig.database.prepare( 'SELECT release FROM release_feed WHERE release LIKE ?' ).pluck().all( `${ source }:%` ) );
		const firstCheck = known.size === 0;

		for ( const release of releases.reverse() ) {
			const key = `${ source }:${ release.id }`;
			if ( known.has( key ) ) continue;

			// Claims release, unless overlapping check already did
			const claimed = BotConfig.database.prepare( 'INSERT OR IGNORE INTO release_feed (release) VALUES (?)' ).run( key ).changes > 0;
			if ( !claimed || firstCheck ) continue;

			try {
				const post = await release.createPost();
				const message = await this.channel.send( {
					components: [ ReleaseFeedUtil.createContainer( post ) ],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { parse: [] },
				} );
				BotConfig.database.prepare( 'UPDATE release_feed SET message = ?, version = ? WHERE release = ?' ).run( message.id, post.version ?? null, key );

				if ( this.config.publish ) {
					await NewsUtil.publishMessage( message );
				}
			} catch ( error ) {
				// Release is tried again on next check
				BotConfig.database.prepare( 'DELETE FROM release_feed WHERE release = ?' ).run( key );
				ReleaseFeedTask.logger.error( `[${ this.id }] Could not post release ${ key }`, error );
			}
		}
	}

	/**
	 * Adds links to slicedlime's videos once they're out, for up to two weeks after post
	 */
	private async linkVideos(): Promise<void> {
		const posts = BotConfig.database.prepare( 'SELECT message, version FROM release_feed WHERE version IS NOT NULL' ).all() as { message: Snowflake; version: string }[];
		if ( posts.length === 0 ) return;

		const videos = await SlicedlimeVideos.getVideos();
		for ( const post of posts ) {
			try {
				if ( !await this.linkPostVideos( post.message, post.version, videos ) ) {
					BotConfig.database.prepare( 'UPDATE release_feed SET version = NULL WHERE message = ?' ).run( post.message );
				}
			} catch ( error ) {
				ReleaseFeedTask.logger.error( `[${ this.id }] Could not link videos of message ${ post.message }`, error );
			}
		}
	}

	/**
	 * Links post's videos that are out, returning whether it still waits for any
	 */
	private async linkPostVideos( id: Snowflake, version: string, videos: Videos ): Promise<boolean> {
		if ( Date.now() - SnowflakeUtil.timestampFrom( id ) > this.maxVideoWait ) return false;

		const message = await this.channel.messages.fetch( id ).catch( ( error: unknown ) => {
			if ( error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownMessage ) return undefined;
			throw error;
		} );
		if ( message === undefined ) return false;

		const container = message.components[0].toJSON() as APIContainerComponent;
		const linked = SlicedlimeVideos.link( container, version, videos );
		if ( linked ) {
			await message.edit( { components: [ linked ], allowedMentions: { parse: [] } } );
		}

		return SlicedlimeVideos.isWaiting( linked ?? container, version );
	}

	public asString(): string {
		return `ReleaseFeedTask[#${ this.id }]`;
	}
}
