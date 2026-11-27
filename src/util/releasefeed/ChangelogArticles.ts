import { ReleaseFeedUtil } from './ReleaseFeedUtil.js';

export interface Article {
	title: string;
	url: string;
	image: string;
}

export interface ArticleImage {
	name: string;
	data: Buffer;
	// Address of changelog article the image was found in
	article?: string;
}

export class ChangelogArticles {
	/**
	 * Latest minecraft.net news articles
	 */
	public static async getArticles(): Promise<Article[]> {
		const { result } = JSON.parse( await ReleaseFeedUtil.request(
			'https://net-secondary.web.minecraft-services.net/api/v1.0/en-us/search?pageSize=24&sortType=Recent&category=News&newsOnly=true'
		) ) as { result: { results: Article[] } };
		return result.results;
	}

	/**
	 * Image at address, or hero image of article with slug, read from its page or else found in search by address or title, unless article isn't out yet
	 */
	public static async getImage( source: string, getArticles: () => Promise<Article[]> ): Promise<ArticleImage | undefined> {
		const found = source.startsWith( 'https://' ) ? { url: source } : await this.findArticle( source, getArticles );
		if ( found === undefined ) return undefined;

		const response = await ReleaseFeedUtil.get( found.url );

		// Attachment name with spaces and similar characters replaced, and extension added when missing
		const file = ( found.url.split( '/' ).pop() as string ).replace( /[^\w.-]+/g, '_' );
		const name = file.includes( '.' ) ? file : `${ file }.${ response.headers.get( 'content-type' )?.split( '/' )[1] ?? 'jpeg' }`;
		return { name, data: Buffer.from( await response.arrayBuffer() ), article: 'article' in found ? found.article : undefined };
	}

	/**
	 * Hero image and address of article with slug, read from its page or else found in search by address or title
	 */
	private static async findArticle( slug: string, getArticles: () => Promise<Article[]> ): Promise<{ url: string; article: string } | undefined> {
		const address = `https://www.minecraft.net/article/${ slug }`;
		const page = await ReleaseFeedUtil.find( address );
		const banner = page && /<meta property="og:image" content="([^"]+)"/.exec( await page.text() )?.[1];
		if ( banner ) return { url: ReleaseFeedUtil.decode( banner ), article: address };

		const article = ( await getArticles() ).find( candidate =>
			candidate.url.endsWith( `/article/${ slug }` ) || ReleaseFeedUtil.slugify( candidate.title.replace( / Changelog$/, '' ) ) === slug );
		return article && { url: article.image, article: article.url };
	}
}
