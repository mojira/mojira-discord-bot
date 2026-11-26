import { APIContainerComponent, ButtonBuilder, ButtonStyle, ContainerBuilder, MediaGalleryBuilder, SeparatorBuilder } from 'discord.js';
import { AccentColor } from './AccentColor.js';
import { ArticleImage } from './ChangelogArticles.js';
import { Post } from './Release.js';

export class ReleaseFeedUtil {
	private static readonly requestTimeout = 30 * 1000;
	private static readonly accentColor = 0x7E956B;

	private static readonly entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ' };

	/**
	 * Response text of URL, failing on error status or timeout
	 */
	public static async request( url: string ): Promise<string> {
		return ( await this.get( url ) ).text();
	}

	/**
	 * Response of URL, failing on error status or timeout
	 */
	public static async get( url: string ): Promise<Response> {
		const response = await fetch( url, { headers: { 'User-Agent': 'Mojira' }, signal: AbortSignal.timeout( this.requestTimeout ) } );
		if ( !response.ok ) {
			throw new Error( `${ url } responded with ${ response.status }` );
		}

		return response;
	}

	/**
	 * First paragraph before first given heading as plain text, skipping publishing and update dates
	 */
	public static getIntro( html: string, heading: string ): string {
		return html.split( heading )[0]
			.split( /<p(?:\s[^>]*)?>/ )
			.slice( 1 )
			// Paragraph ends at its closing tag or next heading, and blank lines inside it split it too
			.flatMap( paragraph => this.decode( paragraph.replace( /<(?:\/p>|h\d)[\s\S]*/, '' ).replace( /<br\s*\/?>/g, '\n' ).replace( /<[^>]*>/g, '' ) ).split( /\n\s*\n/ ) )
			.map( paragraph => paragraph.trim() )
			.find( paragraph => paragraph !== '' && !/^(?:Posted|Published|Update)\b/.test( paragraph ) ) ?? '';
	}

	/**
	 * Title in lowercase with words joined by hyphens, like minecraft.net article addresses
	 */
	public static slugify( title: string ): string {
		return title.toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-|-$/g, '' );
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

	/**
	 * Container with attached image above its content and accent taken from image
	 */
	public static addImage( container: APIContainerComponent, image: ArticleImage ): APIContainerComponent {
		return {
			...container,
			accent_color: AccentColor.fromImage( image.data ) ?? container.accent_color,
			components: [
				new MediaGalleryBuilder().addItems( item => item.setURL( `attachment://${ image.name }` ) ).toJSON(),
				new SeparatorBuilder().setDivider( false ).toJSON(),
				...container.components,
			],
		};
	}
}
