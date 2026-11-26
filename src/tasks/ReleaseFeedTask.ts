import { SendableChannels } from 'discord.js';
import log4js from 'log4js';
import BotConfig, { ReleaseFeedConfig } from '../BotConfig.js';
import { NewsUtil } from '../util/NewsUtil.js';
import { JavaReleases } from '../util/releasefeed/JavaReleases.js';
import { Release } from '../util/releasefeed/Release.js';
import Task from './Task.js';

export default class ReleaseFeedTask extends Task {
	private static logger = log4js.getLogger( 'ReleaseFeedTask' );

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
		BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS release_feed (\'release\' varchar, \'message\' varchar)' );
		BotConfig.database.exec( 'CREATE UNIQUE INDEX IF NOT EXISTS release_feed_release ON release_feed (release)' );
	}

	/**
	 * Checks for new releases
	 */
	protected async run(): Promise<void> {
		try {
			await this.postReleases( 'java', await this.java.getReleases() );
		} catch ( error ) {
			ReleaseFeedTask.logger.error( `[${ this.id }] Could not check java releases`, error );
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
				const message = await this.channel.send( { content: await release.createPost(), allowedMentions: { parse: [] } } );
				BotConfig.database.prepare( 'UPDATE release_feed SET message = ? WHERE release = ?' ).run( message.id, key );

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

	public asString(): string {
		return `ReleaseFeedTask[#${ this.id }]`;
	}
}
