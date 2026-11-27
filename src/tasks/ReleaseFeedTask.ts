import { APIContainerComponent, AttachmentBuilder, DiscordAPIError, Message, MessageFlags, RESTJSONErrorCodes, SendableChannels, Snowflake, SnowflakeUtil } from 'discord.js';
import log4js from 'log4js';
import BotConfig, { ReleaseFeedConfig } from '../BotConfig.js';
import { NewsUtil } from '../util/NewsUtil.js';
import { BedrockReleases } from '../util/releasefeed/BedrockReleases.js';
import { Article, ChangelogArticles } from '../util/releasefeed/ChangelogArticles.js';
import { JavaReleases } from '../util/releasefeed/JavaReleases.js';
import { Release, ReleaseSource } from '../util/releasefeed/Release.js';
import { ReleaseFeedUtil } from '../util/releasefeed/ReleaseFeedUtil.js';
import { SlicedlimeVideos, Videos } from '../util/releasefeed/SlicedlimeVideos.js';
import Task from './Task.js';

type Column = 'article' | 'parent' | 'version';

interface Completion {
	// Container with additions, undefined when unchanged
	container?: APIContainerComponent;
	files?: AttachmentBuilder[];
	waiting: boolean;
}

export default class ReleaseFeedTask extends Task {
	private static logger = log4js.getLogger( 'ReleaseFeedTask' );

	private readonly trackingWindow = 14 * 24 * 60 * 60 * 1000;

	private readonly config: ReleaseFeedConfig;
	private readonly channel: SendableChannels;
	private readonly sources: Record<string, ReleaseSource>;

	private readonly completers: Record<Column, ( container: APIContainerComponent, value: string ) => Promise<Completion>> = {
		article: ( container, slug ) => this.completeImage( container, slug ),
		parent: ( container, parent ) => this.completeAccent( container, parent ),
		version: ( container, version ) => this.completeVideos( container, version ),
	};

	// Fetched once per check and reused
	private articles?: Promise<Article[]>;
	private videos?: Promise<Videos>;

	constructor( config: ReleaseFeedConfig, channel: SendableChannels ) {
		super();

		this.config = config;
		this.channel = channel;
		this.sources = {
			java: new JavaReleases( config ),
			'bedrock-preview': new BedrockReleases( config, '360001185332' ),
			bedrock: new BedrockReleases( config, '360001186971' ),
		};
	}

	/**
	 * Creates table of claimed and posted releases
	 */
	protected async init(): Promise<void> {
		BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS release_feed (\'release\' varchar, \'message\' varchar, \'version\' varchar, \'article\' varchar, \'parent\' varchar)' );
		BotConfig.database.exec( 'CREATE UNIQUE INDEX IF NOT EXISTS release_feed_release ON release_feed (release)' );
	}

	/**
	 * Posts new releases, then runs image, accent and video checks for tracked posts
	 */
	protected async run(): Promise<void> {
		this.articles = undefined;
		this.videos = undefined;

		for ( const [ source, releases ] of Object.entries( this.sources ) ) {
			try {
				await this.postReleases( source, await releases.getReleases() );
			} catch ( error ) {
				ReleaseFeedTask.logger.error( `[${ this.id }] Could not check ${ source } releases`, error );
			}
		}

		for ( const column of Object.keys( this.completers ) as Column[] ) {
			await this.updateTrackedPosts( column );
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
				const waiting: Record<Column, string | undefined> = { article: post.article, parent: post.parent && `${ source }:${ post.parent }`, version: post.version };

				// Runs image, accent and video checks on container before sending, tracking unfinished ones
				let container = ReleaseFeedUtil.createContainer( post ).toJSON();
				const files: AttachmentBuilder[] = [];
				for ( const column of Object.keys( waiting ) as Column[] ) {
					const value = waiting[column];
					if ( value === undefined ) continue;

					const completion = await this.complete( column, container, value, key );
					container = completion.container ?? container;
					files.push( ...completion.files ?? [] );
					if ( !completion.waiting ) waiting[column] = undefined;
				}

				const message = await this.channel.send( { components: [ container ], files, flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } } );
				BotConfig.database.prepare( 'UPDATE release_feed SET message = ?, version = ?, article = ?, parent = ? WHERE release = ?' )
					.run( message.id, waiting.version ?? null, waiting.article ?? null, waiting.parent ?? null, key );

				if ( this.config.publish ) {
					await NewsUtil.publishMessage( message );
				}
			} catch ( error ) {
				// Removes claim so next check retries release
				BotConfig.database.prepare( 'DELETE FROM release_feed WHERE release = ?' ).run( key );
				ReleaseFeedTask.logger.error( `[${ this.id }] Could not post release ${ key }`, error );
			}
		}
	}

	/**
	 * Runs column's check on tracked posts, editing changed ones and untracking finished or gone ones
	 */
	private async updateTrackedPosts( column: Column ): Promise<void> {
		const posts = BotConfig.database.prepare( `SELECT message, ${ column } AS value FROM release_feed WHERE ${ column } IS NOT NULL` ).all() as { message: Snowflake; value: string }[];
		for ( const post of posts ) {
			try {
				const message = await this.fetchTrackedPost( post.message );
				const completion = message && await this.complete( column, message.components[0].toJSON() as APIContainerComponent, post.value, post.message );
				if ( completion?.container ) {
					await message?.edit( { components: [ completion.container ], files: completion.files, allowedMentions: { parse: [] } } );
				}

				if ( !completion?.waiting ) {
					BotConfig.database.prepare( `UPDATE release_feed SET ${ column } = NULL WHERE message = ?` ).run( post.message );
				}
			} catch ( error ) {
				ReleaseFeedTask.logger.error( `[${ this.id }] Could not update ${ column } of message ${ post.message }`, error );
			}
		}
	}

	/**
	 * Runs column's check on container, keeping it tracked when check fails
	 */
	private async complete( column: Column, container: APIContainerComponent, value: string, post: string ): Promise<Completion> {
		try {
			return await this.completers[column]( container, value );
		} catch ( error ) {
			ReleaseFeedTask.logger.error( `[${ this.id }] Could not complete ${ column } of ${ post }`, error );
			return { waiting: true };
		}
	}

	/**
	 * Post's message, unless it's past tracking window or deleted
	 */
	private async fetchTrackedPost( id: Snowflake ): Promise<Message | undefined> {
		if ( Date.now() - SnowflakeUtil.timestampFrom( id ) > this.trackingWindow ) return undefined;

		return this.fetchPost( id );
	}

	/**
	 * Post's message, unless it's deleted
	 */
	private async fetchPost( id: Snowflake ): Promise<Message | undefined> {
		return this.channel.messages.fetch( id ).catch( ( error: unknown ) => {
			if ( error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownMessage ) return undefined;
			throw error;
		} );
	}

	/**
	 * Adds changelog article's hero image if article is out, replacing guessed changelog link with article's address
	 */
	private async completeImage( container: APIContainerComponent, slug: string ): Promise<Completion> {
		const image = await ChangelogArticles.getImage( slug, () => this.articles ??= ChangelogArticles.getArticles() );
		if ( image === undefined ) return { waiting: true };

		const withImage = ReleaseFeedUtil.addImage( container, image );
		return {
			container: image.article ? ReleaseFeedUtil.replaceLink( withImage, `https://www.minecraft.net/article/${ slug }`, image.article ) : withImage,
			files: [ new AttachmentBuilder( image.data, { name: image.name } ) ],
			waiting: false,
		};
	}

	/**
	 * Copies accent of parent release's post if its image was added
	 */
	private async completeAccent( container: APIContainerComponent, parent: string ): Promise<Completion> {
		const row = BotConfig.database.prepare( 'SELECT message, article FROM release_feed WHERE release = ?' ).get( parent ) as { message: Snowflake | null; article: string | null } | undefined;
		if ( row?.article ) return { waiting: true };

		const parentMessage = row?.message ? await this.fetchPost( row.message ) : undefined;
		if ( parentMessage === undefined ) return { waiting: false };

		const accent = ( parentMessage.components[0].toJSON() as APIContainerComponent ).accent_color;
		return { container: { ...container, accent_color: accent }, waiting: false };
	}

	/**
	 * Links published slicedlime videos about version
	 */
	private async completeVideos( container: APIContainerComponent, version: string ): Promise<Completion> {
		const linked = SlicedlimeVideos.link( container, version, await ( this.videos ??= SlicedlimeVideos.getVideos() ) );
		return { container: linked, waiting: SlicedlimeVideos.isWaiting( linked ?? container, version ) };
	}

	public asString(): string {
		return `ReleaseFeedTask[#${ this.id }]`;
	}
}
