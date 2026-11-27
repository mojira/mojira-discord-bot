import { ReleaseFeedUtil } from './ReleaseFeedUtil.js';

export interface Article {
	title: string;
	url: string;
	image: string;
}

export interface ArticleImage {
	name: string;
	data: Buffer;
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
	 * Hero image of article with slug, read from its page or else found in search by address or title, unless article isn't out yet
	 */
	public static async getImage( slug: string, getArticles: () => Promise<Article[]> ): Promise<ArticleImage | undefined> {
		const page = await ReleaseFeedUtil.find( `https://www.minecraft.net/article/${ slug }` );
		const banner = page && /<meta property="og:image" content="([^"]+)"/.exec( await page.text() )?.[1];
		const url = banner ? ReleaseFeedUtil.decode( banner ) : ( await getArticles() ).find( candidate =>
			candidate.url.endsWith( `/article/${ slug }` ) || ReleaseFeedUtil.slugify( candidate.title.replace( / Changelog$/, '' ) ) === slug )?.image;
		if ( url === undefined ) return undefined;

		const response = await ReleaseFeedUtil.get( url );

		// Attachment name with spaces and similar characters replaced
		const name = ( url.split( '/' ).pop() as string ).replace( /[^\w.-]+/g, '_' );
		return { name, data: Buffer.from( await response.arrayBuffer() ) };
	}
}
