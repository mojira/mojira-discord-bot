import { APIContainerComponent, APITextDisplayComponent, ComponentType, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from 'discord.js';
import { ReleaseFeedUtil } from './ReleaseFeedUtil.js';

interface Video {
	id: string;
	title: string;
}

export type Videos = Record<string, Video[]>;

export class SlicedlimeVideos {
	private static readonly channels: Record<string, string> = {
		gameplay: 'UCXoqL7S2DjbrJe5ewfmlDvw',
		technical: 'UC2UyQpCGPw01q62SapQSuyw',
	};

	/**
	 * Latest videos of each channel by kind
	 */
	public static async getVideos(): Promise<Videos> {
		const videos: Videos = {};
		for ( const [ kind, channel ] of Object.entries( this.channels ) ) {
			const feed = await ReleaseFeedUtil.request( `https://www.youtube.com/feeds/videos.xml?channel_id=${ channel }` );
			videos[kind] = [ ...feed.matchAll( /<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]*?<title>([^<]*)<\/title>/g ) ]
				.map( ( [ , id, title ] ) => ( { id, title: ReleaseFeedUtil.decode( title ) } ) );
		}

		return videos;
	}

	/**
	 * Container with video line listing linked and newly found videos about version, unless none were found
	 */
	public static link( container: APIContainerComponent, version: string, videos: Videos ): APIContainerComponent | undefined {
		const linked = this.getLinked( container );
		const found = this.getKinds( version ).filter( kind => !linked.has( kind ) ).flatMap( kind => {
			const video = videos[kind].find( candidate => this.mentions( candidate.title, version ) );
			return video ? [ [ kind, `https://www.youtube.com/watch?v=${ video.id }` ] as const ] : [];
		} );
		if ( found.length === 0 ) return undefined;

		const all = new Map( [ ...linked, ...found ] );
		const links = this.getKinds( version ).filter( kind => all.has( kind ) ).map( kind => `[${ kind } changes](${ all.get( kind ) })` );
		return {
			...container,
			components: [
				...container.components.slice( 0, this.getButtonsIndex( container ) + 1 ),
				new SeparatorBuilder().setSpacing( SeparatorSpacingSize.Large ).toJSON(),
				new TextDisplayBuilder().setContent( `-# Watch slicedlime's video${ links.length > 1 ? 's' : '' } to get an overview over the ${ links.join( ' and ' ) }.` ).toJSON(),
			],
		};
	}

	/**
	 * Whether container still misses video about version
	 */
	public static isWaiting( container: APIContainerComponent, version: string ): boolean {
		return this.getLinked( container ).size < this.getKinds( version ).length;
	}

	/**
	 * Kinds of videos about version, with technical changes video only for snapshots and pre-releases
	 */
	private static getKinds( version: string ): string[] {
		return /Snapshot|Pre-Release/i.test( version ) ? [ 'gameplay', 'technical' ] : [ 'gameplay' ];
	}

	/**
	 * Video links in container's video line by kind
	 */
	private static getLinked( container: APIContainerComponent ): Map<string, string> {
		const line = container.components.slice( this.getButtonsIndex( container ) + 1 )
			.find( component => component.type === ComponentType.TextDisplay ) as APITextDisplayComponent | undefined;
		return new Map( [ ...( line?.content ?? '' ).matchAll( /\[(\w+) changes\]\(([^)]+)\)/g ) ].map( ( [ , kind, url ] ) => [ kind, url ] ) );
	}

	private static getButtonsIndex( container: APIContainerComponent ): number {
		return container.components.findIndex( component => component.type === ComponentType.ActionRow );
	}

	/**
	 * Whether video title is about version, also when listed like "Snapshot 9 & 10"
	 */
	private static mentions( title: string, version: string ): boolean {
		const numbered = /^(.+) (\d+)$/.exec( version );
		if ( numbered === null ) {
			return new RegExp( `Minecraft ${ this.escape( version ) }(?!\\.?\\d| Snapshot| Pre-Release| Release Candidate)`, 'i' ).test( title );
		}

		const listed = new RegExp( `(?<![\\d.])${ this.escape( numbered[1] ) } (\\d+(?:(?:\\s*[&,]\\s*|\\s+and\\s+)\\d+)*)`, 'i' ).exec( title );
		return listed !== null && listed[1].split( /\D+/ ).includes( numbered[2] );
	}

	private static escape( text: string ): string {
		return text.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
	}
}
