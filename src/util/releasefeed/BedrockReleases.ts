import { ReleaseFeedConfig } from '../../BotConfig.js';
import { Post, Release } from './Release.js';
import { ReleaseFeedUtil } from './ReleaseFeedUtil.js';

interface FeedbackArticle {
	id: number;
	title: string;
	body: string;
}

export class BedrockReleases {
	private readonly config: ReleaseFeedConfig;
	private readonly section: string;

	constructor( config: ReleaseFeedConfig, section: string ) {
		this.config = config;
		this.section = section;
	}

	/**
	 * Bedrock releases from feedback site section, newest first
	 */
	public async getReleases(): Promise<Release[]> {
		const { articles } = JSON.parse( await ReleaseFeedUtil.request(
			`https://feedback.minecraft.net/api/v2/help_center/en-us/sections/${ this.section }/articles.json?sort_by=created_at&sort_order=desc&per_page=10`
		) ) as { articles: FeedbackArticle[] };

		return articles.flatMap( article => {
			const post = this.createPost( article, articles );
			return post ? [ { id: String( article.id ), createPost: async () => post } ] : [];
		} );
	}

	/**
	 * Post for Bedrock patch notes article
	 */
	private createPost( article: FeedbackArticle, articles: FeedbackArticle[] ): Post | undefined {
		const base = {
			author: `${ this.config.emoji } Written By Bedrock Team`,
			intro: ReleaseFeedUtil.getIntro( article.body, '<h2' ),
			changelog: `https://feedback.minecraft.net/hc/en-us/articles/${ article.id }`,
		};
		const headerImage = /<img\s[^>]*src="([^"]+)"/.exec( article.body.split( '<h2' )[0] )?.[1];

		// Wiki page and changelog article use first version of ones like "26.60.22/23"
		const preview = /^Minecraft Beta & Preview - (([\d.]+)[\d./]*)$/.exec( article.title );
		if ( preview ) {
			return {
				...base,
				heading: `Minecraft: Bedrock Edition Beta & Preview ${ preview[1] }`,
				wiki: `https://minecraft.wiki/w/Bedrock_Edition_Preview_${ preview[2] }`,
				article: headerImage ? ReleaseFeedUtil.decode( headerImage ) : ReleaseFeedUtil.slugify( `Minecraft Preview ${ preview[2] }` ),
			};
		}

		const hotfix = /^Minecraft: Bedrock Edition (([\d.]+?)(?:\/[\d./]+)?) Hotfix\b/.exec( article.title );
		if ( hotfix ) {
			return {
				...base,
				heading: `Minecraft: Bedrock Edition ${ hotfix[1] } Hotfix`,
				wiki: `https://minecraft.wiki/w/Bedrock_Edition_${ hotfix[2] }`,
				parent: this.getFixedRelease( hotfix[2], articles )?.id.toString(),
			};
		}

		const version = this.getReleaseVersion( article.title );
		if ( version ) {
			return {
				...base,
				heading: `Minecraft: Bedrock Edition ${ version }`,
				wiki: `https://minecraft.wiki/w/Bedrock_Edition_${ version }`,
				article: headerImage ? ReleaseFeedUtil.decode( headerImage ) : ReleaseFeedUtil.slugify( `Minecraft: Bedrock Edition ${ version }` ),
			};
		}

		return undefined;
	}

	/**
	 * Release article fixed by hotfix version, like 26.60 for 26.63
	 */
	private getFixedRelease( version: string, articles: FeedbackArticle[] ): FeedbackArticle | undefined {
		const [ major, minor ] = version.split( '.' ).map( Number );
		return articles.find( article => this.getReleaseVersion( article.title ) === `${ major }.${ Math.floor( minor / 10 ) * 10 }` );
	}

	/**
	 * Version of Bedrock release article
	 */
	private getReleaseVersion( title: string ): string | undefined {
		return /^Minecraft: Bedrock Edition (\d+\.\d+)(?: Changelog)?(?: - .*)?$/.exec( title )?.[1];
	}
}
