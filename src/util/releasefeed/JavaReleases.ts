import { ReleaseFeedConfig } from '../../BotConfig.js';
import { Post, Release } from './Release.js';
import { ReleaseFeedUtil } from './ReleaseFeedUtil.js';

interface JavaPatchNote {
	title: string;
	version: string;
	type: string;
	date: string;
	contentPath: string;
}

export class JavaReleases {
	private readonly hotfixWindow = 6 * 60 * 60 * 1000;

	private readonly config: ReleaseFeedConfig;

	constructor( config: ReleaseFeedConfig ) {
		this.config = config;
	}

	/**
	 * Java releases from launcher patch notes, newest first
	 */
	public async getReleases(): Promise<Release[]> {
		const { entries } = JSON.parse( await ReleaseFeedUtil.request( 'https://launchercontent.mojang.com/v2/javaPatchNotes.json' ) ) as { entries: JavaPatchNote[] };
		return entries.map( ( entry, index ) => ( {
			id: entry.version,
			createPost: () => this.createPost( entry, this.getAnnouncedEntry( entries.slice( index ) ) ),
		} ) );
	}

	/**
	 * Entry whose changelog covers first one, skipping hotfixes
	 */
	private getAnnouncedEntry( entries: JavaPatchNote[] ): JavaPatchNote {
		const [ entry, previous ] = entries;
		const hotfix = previous !== undefined && entry.type !== 'release' && Date.parse( entry.date ) - Date.parse( previous.date ) < this.hotfixWindow;
		return hotfix ? this.getAnnouncedEntry( entries.slice( 1 ) ) : entry;
	}

	/**
	 * Post for Java release with its intro, changelog and wiki page
	 */
	private async createPost( entry: JavaPatchNote, announced: JavaPatchNote ): Promise<Post> {
		const { body } = JSON.parse( await ReleaseFeedUtil.request( `https://launchercontent.mojang.com/v2/${ entry.contentPath }` ) ) as { body: string };
		const version = this.getVersion( entry );
		const slug = announced.title.toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-|-$/g, '' );

		return {
			author: `${ this.config.emoji } Written By Java Team`,
			heading: `Minecraft: Java Edition ${ version }`,
			intro: ReleaseFeedUtil.getIntro( body ),
			changelog: `https://www.minecraft.net/article/${ slug }`,
			wiki: `https://minecraft.wiki/w/Java_Edition_${ version.replaceAll( ' ', '_' ) }`,
			version: this.getVersion( announced ),
			article: slug,
		};
	}

	private getVersion( entry: JavaPatchNote ): string {
		return entry.title.replace( /^Minecraft(?:: Java Edition)? /, '' );
	}
}
