import { ButtonBuilder, ButtonStyle, ContainerBuilder } from 'discord.js';
import { Post } from './Release.js';

export class ReleaseFeedUtil {
	private static readonly requestTimeout = 30 * 1000;
	private static readonly accentColor = 0x7E956B;

	private static readonly entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ' };

	/**
	 * Response text of URL, failing on error status or timeout
	 */
	public static async request( url: string ): Promise<string> {
		const response = await fetch( url, { headers: { 'User-Agent': 'MojiraBot' }, signal: AbortSignal.timeout( this.requestTimeout ) } );
		if ( !response.ok ) {
			throw new Error( `${ url } responded with ${ response.status }` );
		}

		return response.text();
	}

	/**
	 * First paragraph before first main heading as plain text
	 */
	public static getIntro( html: string ): string {
		return html.split( '<h1' )[0]
			.split( /<p(?:\s[^>]*)?>/ )
			.slice( 1 )
			// Paragraph ends at its closing tag or next heading
			.map( paragraph => this.decode( paragraph.replace( /<(?:\/p>|h\d)[\s\S]*/, '' ).replace( /<[^>]*>/g, '' ) ).trim() )
			.find( paragraph => paragraph !== '' ) ?? '';
	}

	/**
	 * Text with HTML entities replaced by their characters
	 */
	public static decode( text: string ): string {
		return text
			.replace( /&#x([\da-f]+);?/gi, ( _, hex: string ) => String.fromCodePoint( parseInt( hex, 16 ) ) )
			.replace( /&#(\d+);?/g, ( _, code: string ) => String.fromCodePoint( Number( code ) ) )
			.replace( /&(amp|lt|gt|quot|apos|nbsp);/g, ( _, name: string ) => this.entities[name] );
	}

	/**
	 * Container with post's byline, heading, intro and link buttons
	 */
	public static createContainer( post: Post ): ContainerBuilder {
		return new ContainerBuilder()
			.setAccentColor( this.accentColor )
			.addTextDisplayComponents(
				text => text.setContent( `-# ${ post.author }` ),
				text => text.setContent( `## ${ post.heading }${ post.intro ? `\n${ post.intro }` : '' }` ),
			)
			.addSeparatorComponents( separator => separator.setDivider( false ) )
			.addActionRowComponents( row => row.setComponents(
				new ButtonBuilder().setStyle( ButtonStyle.Link ).setLabel( 'Read Changelog' ).setURL( post.changelog ),
				new ButtonBuilder().setStyle( ButtonStyle.Link ).setLabel( 'Visit Wiki' ).setURL( post.wiki ),
			) );
	}
}
