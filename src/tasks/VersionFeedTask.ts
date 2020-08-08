import * as log4js from 'log4js';
import Task from './Task';
import { Channel, TextChannel, RichEmbed } from 'discord.js';
import { VersionFeedConfig } from '../BotConfig';
import JiraClient from 'jira-connector';
import { NewsUtil } from '../util/NewsUtil';

interface JiraVersion {
	id: string;
	name: string;
	archived: boolean;
	released: boolean;
	releaseDate?: string;
}

interface JiraVersionChange {
	message: string;
	embed?: RichEmbed;
}

export type VersionChangeType = 'created' | 'released' | 'unreleased' | 'archived' | 'unarchived' | 'renamed';

export default class VersionFeedTask extends Task {
	public static logger = log4js.getLogger( 'Version' );

	private jira: JiraClient;

	private channel: Channel;
	private project: string;
	private scope: number;
	private actions: VersionChangeType[];

	private cachedVersions: JiraVersion[] = [];

	private initialized = false;

	constructor( { project, scope, actions }: VersionFeedConfig, channel: Channel ) {
		super();

		this.channel = channel;
		this.project = project;
		this.scope = scope;
		this.actions = actions;

		this.jira = new JiraClient( {
			host: 'bugs.mojang.com',
			strictSSL: true,
		} );

		this.getVersions().then(
			versions => {
				this.cachedVersions = versions;
				this.initialized = true;
			}
		).catch(
			error => {
				VersionFeedTask.logger.error( error );
				this.initialized = true;
			}
		);
	}

	public async run(): Promise<void> {
		if ( !this.initialized ) return;

		if ( !( this.channel instanceof TextChannel ) ) {
			VersionFeedTask.logger.error( `Expected ${ this.channel } to be a TextChannel` );
			return;
		}

		const currentVersions = await this.getVersions();
		const changes = await this.getVersionChanges( this.cachedVersions, currentVersions );

		for ( const change of changes ) {
			const versionFeedMessage = await this.channel.send( change.message, change.embed );
			NewsUtil.publishMessage( versionFeedMessage );
			versionFeedMessage.react( this.versionFeedEmoji );
		}

		this.cachedVersions = currentVersions;
	}

	private async getVersions(): Promise<JiraVersion[]> {
		const results = await this.jira.project.getVersionsPaginated( {
			projectIdOrKey: this.project,
			maxResults: this.scope,
			orderBy: '-sequence',
		} );

		const versions: JiraVersion[] = [...this.cachedVersions];

		for ( const value of results.values ) {
			const version: JiraVersion = {
				id: value.id,
				name: value.name,
				archived: value.archived,
				released: value.released,
				releaseDate: value.releaseDate,
			};

			const replaceId = versions.findIndex( it => value.id === it.id );

			if ( replaceId < 0 ) {
				versions.push( version );
			} else {
				versions[replaceId] = version;
			}
		}

		return versions;
	}

	private async getVersionChanges( previous: JiraVersion[], current: JiraVersion[] ): Promise<JiraVersionChange[]> {
		const changes: JiraVersionChange[] = [];

		for ( const version of current ) {
			const previousVersion = previous.find( it => it.id === version.id );

			if ( previousVersion === undefined ) {
				if ( !this.actions.includes( 'created' ) ) break;

				changes.push( {
					message: `Version **${ version.name }** has been created.`,
					embed: await this.getVersionEmbed( version ),
				} );
			} else {
				if ( previousVersion.name !== version.name ) {
					if ( !this.actions.includes( 'renamed' ) ) break;

					changes.push( {
						message: `Version **${ previousVersion.name }** has been renamed to **${ version.name }**.`,
						embed: await this.getVersionEmbed( version ),
					} );
				}

				if ( previousVersion.archived !== version.archived ) {
					if ( version.archived === true && !this.actions.includes( 'archived' ) ) break;
					if ( version.archived === false && !this.actions.includes( 'unarchived' ) ) break;

					changes.push( {
						message: `Version **${ version.name }** has been ${ version.archived ? '' : 'un' }archived.`,
						embed: await this.getVersionEmbed( version ),
					} );
				}

				if ( previousVersion.released !== version.released ) {
					if ( version.released === true && !this.actions.includes( 'released' ) ) break;
					if ( version.released === false && !this.actions.includes( 'unreleased' ) ) break;

					changes.push( {
						message: `Version **${ version.name }** has been ${ version.released ? '' : 'un' }released.`,
						embed: await this.getVersionEmbed( version ),
					} );
				}
			}
		}

		return changes;
	}

	private async getVersionEmbed( version: JiraVersion ): Promise<RichEmbed> {
		const embed = new RichEmbed()
			.setTitle( version.name )
			.setColor( 'PURPLE' );

		let versionIssueCounts: {
			issuesAffectedCount: number;
			issuesFixedCount: number;
		};

		try {
			versionIssueCounts = await this.jira.version.getRelatedIssueCounts( {
				versionId: version.id,
			} );
		} catch ( error ) {
			VersionFeedTask.logger.error( error );
			return undefined;
		}

		const affectedIssues = versionIssueCounts.issuesAffectedCount;
		const fixedIssues = versionIssueCounts.issuesFixedCount;

		if ( affectedIssues > 0 ) {
			const affectedSearchQuery = `affectedVersion = ${ version.id } ORDER BY created ASC`;
			embed.addField( 'Affected', `[${ affectedIssues } issue${ affectedIssues > 1 ? 's' : '' }](https://bugs.mojang.com/issues/?jql=${ affectedSearchQuery.replace( /\s+/ig, '%20' ) })`, true );
		}

		if ( fixedIssues > 0 ) {
			const fixedSearchQuery = `fixVersion = ${ version.id } ORDER BY key ASC`;
			embed.addField( 'Fixed', `[${ fixedIssues } issue${ fixedIssues > 1 ? 's' : '' }](https://bugs.mojang.com/issues/?jql=${ fixedSearchQuery.replace( /\s+/ig, '%20' ) })`, true );
		}

		if ( version.releaseDate !== undefined ) {
			embed.addField( 'Released', version.releaseDate, true );
		}

		if ( !embed.fields?.length ) {
			return undefined;
		}

		return embed;
	}
}
