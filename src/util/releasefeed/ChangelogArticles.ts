import { ReleaseFeedUtil } from './ReleaseFeedUtil.js';

export interface Article {
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
	 * Hero image of article with slug, unless article isn't out yet
	 */
	public static async getImage( articles: Article[], slug: string ): Promise<ArticleImage | undefined> {
		const article = articles.find( candidate => candidate.url.endsWith( `/article/${ slug }` ) );
		if ( article === undefined ) return undefined;

		const response = await ReleaseFeedUtil.get( article.image );

		// Attachment name with spaces and similar characters replaced
		const name = ( article.image.split( '/' ).pop() as string ).replace( /[^\w.-]+/g, '_' );
		return { name, data: Buffer.from( await response.arrayBuffer() ) };
	}
}
