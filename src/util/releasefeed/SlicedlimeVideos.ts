import { ReleaseFeedUtil } from './ReleaseFeedUtil.js';

interface Video {
	id: string;
	title: string;
}

export type Videos = Record<string, Video[]>;

export class SlicedlimeVideos {
	private static readonly gameplay = 'Slicedlime\'s Gameplay Changes Video';
	private static readonly technical = 'Slicedlime\'s Technical Changes Video';
	private static readonly channels: Record<string, string> = {
		[this.gameplay]: 'UCXoqL7S2DjbrJe5ewfmlDvw',
		[this.technical]: 'UC2UyQpCGPw01q62SapQSuyw',
	};

	/**
	 * Labels of videos about version, with technical changes video only for snapshots and pre-releases
	 */
	public static getLabels( version: string ): string[] {
		return /Snapshot|Pre-Release/i.test( version ) ? [ this.gameplay, this.technical ] : [ this.gameplay ];
	}

	/**
	 * Latest videos of each channel by label
	 */
	public static async getVideos(): Promise<Videos> {
		const videos: Videos = {};
		for ( const [ label, channel ] of Object.entries( this.channels ) ) {
			const feed = await ReleaseFeedUtil.request( `https://www.youtube.com/feeds/videos.xml?channel_id=${ channel }` );
			videos[label] = [ ...feed.matchAll( /<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]*?<title>([^<]*)<\/title>/g ) ]
				.map( ( [ , id, title ] ) => ( { id, title: ReleaseFeedUtil.decode( title ) } ) );
		}

		return videos;
	}

	/**
	 * Post content with links of videos about version added to its waiting video lines
	 */
	public static link( content: string, version: string, videos: Videos ): string {
		return content.split( '\n' ).map( line => {
			const label = this.getWaitingLabel( line );
			const video = label && videos[label].find( candidate => this.mentions( candidate.title, version ) );
			return video ? `${ line } 🔗 <https://www.youtube.com/watch?v=${ video.id }>` : line;
		} ).join( '\n' );
	}

	/**
	 * Whether post content still has video line without link
	 */
	public static isWaiting( content: string ): boolean {
		return content.split( '\n' ).some( line => this.getWaitingLabel( line ) !== undefined );
	}

	private static getWaitingLabel( line: string ): string | undefined {
		return Object.keys( this.channels ).find( label => line.endsWith( ` ${ label }` ) );
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
