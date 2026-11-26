import { APIContainerComponent, AttachmentBuilder, DiscordAPIError, Message, MessageFlags, RESTJSONErrorCodes, SendableChannels, Snowflake, SnowflakeUtil } from 'discord.js';
import log4js from 'log4js';
import BotConfig, { ReleaseFeedConfig } from '../BotConfig.js';
import { NewsUtil } from '../util/NewsUtil.js';
import { Article, ChangelogArticles } from '../util/releasefeed/ChangelogArticles.js';
import { JavaReleases } from '../util/releasefeed/JavaReleases.js';
import { Release } from '../util/releasefeed/Release.js';
import { ReleaseFeedUtil } from '../util/releasefeed/ReleaseFeedUtil.js';
import { SlicedlimeVideos, Videos } from '../util/releasefeed/SlicedlimeVideos.js';
import Task from './Task.js';

export default class ReleaseFeedTask extends Task {
	private static logger = log4js.getLogger( 'ReleaseFeedTask' );

	private readonly trackingWindow = 14 * 24 * 60 * 60 * 1000;

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
		BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS release_feed (\'release\' varchar, \'message\' varchar, \'version\' varchar, \'article\' varchar, \'parent\' varchar)' );
		BotConfig.database.exec( 'CREATE UNIQUE INDEX IF NOT EXISTS release_feed_release ON release_feed (release)' );
	}

	/**
	 * Checks for new releases, images and videos
	 */
	protected async run(): Promise<void> {
		try {
			await this.postReleases( 'java', await this.java.getReleases() );
		} catch ( error ) {
			ReleaseFeedTask.logger.error( `[${ this.id }] Could not check java releases`, error );
		}

		try {
			await this.updateTrackedPosts( 'article', () => ChangelogArticles.getArticles(), ( message, slug, articles ) => this.addImage( message, slug, articles ) );
		} catch ( error ) {
			ReleaseFeedTask.logger.error( `[${ this.id }] Could not check images`, error );
		}

		try {
			await this.updateTrackedPosts( 'parent', async () => undefined, ( message, parent ) => this.copyAccent( message, parent ) );
		} catch ( error ) {
			ReleaseFeedTask.logger.error( `[${ this.id }] Could not check accents`, error );
		}

		try {
			await this.updateTrackedPosts( 'version', () => SlicedlimeVideos.getVideos(), ( message, version, videos ) => this.linkVideos( message, version, videos ) );
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
				BotConfig.database.prepare( 'UPDATE release_feed SET message = ?, version = ?, article = ?, parent = ? WHERE release = ?' )
					.run( message.id, post.version ?? null, post.article ?? null, post.parent ? `${ source }:${ post.parent }` : null, key );

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
	 * Updates posts still waiting for column's content, which stops once update returns false or post is gone
	 */
	private async updateTrackedPosts<T>( column: 'version' | 'article' | 'parent', load: () => Promise<T>, update: ( message: Message, value: string, data: T ) => Promise<boolean> ): Promise<void> {
		const posts = BotConfig.database.prepare( `SELECT message, ${ column } AS value FROM release_feed WHERE ${ column } IS NOT NULL` ).all() as { message: Snowflake; value: string }[];
		if ( posts.length === 0 ) return;

		const data = await load();
		for ( const post of posts ) {
			try {
				const message = await this.fetchTrackedPost( post.message );
				if ( message === undefined || !await update( message, post.value, data ) ) {
					BotConfig.database.prepare( `UPDATE release_feed SET ${ column } = NULL WHERE message = ?` ).run( post.message );
				}
			} catch ( error ) {
				ReleaseFeedTask.logger.error( `[${ this.id }] Could not update ${ column } of message ${ post.message }`, error );
			}
		}
	}

	/**
	 * Post's message, unless it's past tracking window or deleted
	 */
	private async fetchTrackedPost( id: Snowflake ): Promise<Message | undefined> {
		if ( Date.now() - SnowflakeUtil.timestampFrom( id ) > this.trackingWindow ) return undefined;

		return this.channel.messages.fetch( id ).catch( ( error: unknown ) => {
			if ( error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownMessage ) return undefined;
			throw error;
		} );
	}

	/**
	 * Adds hero image of post's changelog article once it's out, returning whether post still waits for it
	 */
	private async addImage( message: Message, slug: string, articles: Article[] ): Promise<boolean> {
		const image = await ChangelogArticles.getImage( articles, slug );
		if ( image === undefined ) return true;

		await message.edit( {
			components: [ ReleaseFeedUtil.addImage( message.components[0].toJSON() as APIContainerComponent, image ) ],
			files: [ new AttachmentBuilder( image.data, { name: image.name } ) ],
			allowedMentions: { parse: [] },
		} );
		return false;
	}

	/**
	 * Copies accent of parent release's post once its image is added, returning whether post still waits for it
	 */
	private async copyAccent( message: Message, parent: string ): Promise<boolean> {
		const row = BotConfig.database.prepare( 'SELECT message, article FROM release_feed WHERE release = ?' ).get( parent ) as { message: Snowflake | null; article: string | null } | undefined;
		if ( row?.article ) return true;

		const parentMessage = row?.message ? await this.fetchTrackedPost( row.message ) : undefined;
		if ( parentMessage === undefined ) return false;

		const container = message.components[0].toJSON() as APIContainerComponent;
		const accent = ( parentMessage.components[0].toJSON() as APIContainerComponent ).accent_color;
		await message.edit( { components: [ { ...container, accent_color: accent } ], allowedMentions: { parse: [] } } );
		return false;
	}

	/**
	 * Links slicedlime's videos about post's version that are out, returning whether post still waits for any
	 */
	private async linkVideos( message: Message, version: string, videos: Videos ): Promise<boolean> {
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
