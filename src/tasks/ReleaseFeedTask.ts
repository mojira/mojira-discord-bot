import { SendableChannels } from 'discord.js';
import log4js from 'log4js';
import BotConfig, { ReleaseFeedConfig } from '../BotConfig.js';
import { NewsUtil } from '../util/NewsUtil.js';
import Task from './Task.js';

interface Release {
	id: string;
	createPost: () => Promise<string>;
}

interface JavaPatchNote {
	title: string;
	version: string;
	contentPath: string;
}

export default class ReleaseFeedTask extends Task {
	private static logger = log4js.getLogger( 'ReleaseFeedTask' );

	private readonly requestTimeout = 30 * 1000;

	private readonly entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ' };

	private readonly config: ReleaseFeedConfig;
	private readonly channel: SendableChannels;

	constructor( config: ReleaseFeedConfig, channel: SendableChannels ) {
		super();

		this.config = config;
		this.channel = channel;
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
			await this.postReleases( 'java', await this.getJavaReleases() );
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

	/**
	 * Java releases from launcher patch notes, newest first
	 */
	private async getJavaReleases(): Promise<Release[]> {
		const { entries } = JSON.parse( await this.request( 'https://launchercontent.mojang.com/v2/javaPatchNotes.json' ) ) as { entries: JavaPatchNote[] };
		return entries.map( entry => ( { id: entry.version, createPost: () => this.createJavaPost( entry ) } ) );
	}

	/**
	 * Post for Java release with its intro, blog post and wiki page
	 */
	private async createJavaPost( entry: JavaPatchNote ): Promise<string> {
		const { body } = JSON.parse( await this.request( `https://launchercontent.mojang.com/v2/${ entry.contentPath }` ) ) as { body: string };
		const version = entry.title.replace( /^Minecraft(?:: Java Edition)? /, '' );
		const slug = entry.title.toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-|-$/g, '' );

		return this.format( `Minecraft: Java Edition ${ version }`, this.getIntro( body ), [
			this.link( this.config.mojangEmoji, 'Official Blog Post', `https://www.minecraft.net/article/${ slug }` ),
			this.link( this.config.wikiEmoji, 'Minecraft Wiki', `https://minecraft.wiki/w/Java_Edition_${ version.replaceAll( ' ', '_' ) }` ),
		] );
	}

	private format( heading: string, intro: string, links: string[] ): string {
		return `**${ heading } has been released.**${ intro ? `\n${ intro }` : '' }\n\n${ links.join( '\n' ) }`;
	}

	private link( emoji: string, label: string, url: string ): string {
		return `${ emoji } ${ label } 🔗 <${ url }>`;
	}

	/**
	 * Paragraphs before first main heading as plain text
	 */
	private getIntro( html: string ): string {
		return html.split( '<h1' )[0]
			.split( /<p(?:\s[^>]*)?>/ )
			.slice( 1 )
			// Paragraph ends at its closing tag or next heading
			.map( paragraph => this.decode( paragraph.replace( /<(?:\/p>|h\d)[\s\S]*/, '' ).replace( /<[^>]*>/g, '' ) ).trim() )
			.filter( paragraph => paragraph !== '' )
			.join( '\n\n' );
	}

	/**
	 * Text with HTML entities replaced by their characters
	 */
	private decode( text: string ): string {
		return text
			.replace( /&#x([\da-f]+);?/gi, ( _, hex: string ) => String.fromCodePoint( parseInt( hex, 16 ) ) )
			.replace( /&#(\d+);?/g, ( _, code: string ) => String.fromCodePoint( Number( code ) ) )
			.replace( /&(amp|lt|gt|quot|apos|nbsp);/g, ( _, name: string ) => this.entities[name] );
	}

	/**
	 * Response text of URL, failing on error status or timeout
	 */
	private async request( url: string ): Promise<string> {
		const response = await fetch( url, { headers: { 'User-Agent': 'MojiraBot' }, signal: AbortSignal.timeout( this.requestTimeout ) } );
		if ( !response.ok ) {
			throw new Error( `${ url } responded with ${ response.status }` );
		}

		return response.text();
	}

	public asString(): string {
		return `ReleaseFeedTask[#${ this.id }]`;
	}
}
