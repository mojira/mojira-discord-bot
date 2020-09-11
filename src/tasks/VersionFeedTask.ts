import { Channel, MessageEmbed, TextChannel } from 'discord.js';
import JiraClient from 'jira-connector';
import * as log4js from 'log4js';
import { VersionFeedConfig } from '../BotConfig';
import { NewsUtil } from '../util/NewsUtil';
import Task from './Task';

interface JiraVersion {
	id: string;
	name: string;
	archived: boolean;
	released: boolean;
	releaseDate?: string;
	project: string;
}

interface JiraVersionChange {
	message: string;
	embed?: MessageEmbed;
}

export type VersionChangeType = 'created' | 'released' | 'unreleased' | 'archived' | 'unarchived' | 'renamed';

export default class VersionFeedTask extends Task {
	private static logger = log4js.getLogger( 'VersionFeedTask' );

	private jira: JiraClient;

	private channel: Channel;
	private projects: string[];
	private versionFeedEmoji: string;
	private scope: number;
	private actions: VersionChangeType[];

	private cachedVersions: JiraVersion[] = [];

	private initialized = false;

	constructor( { projects, scope, actions, versionFeedEmoji }: VersionFeedConfig, channel: Channel ) {
		super();

		this.channel = channel;
		this.projects = projects;
		this.scope = scope;
		this.actions = actions;
		this.versionFeedEmoji = versionFeedEmoji;

		this.jira = new JiraClient( {
			host: 'bugs.mojang.com',
			strictSSL: true,
		} );

		this.getVersions().then(
			async versions => {
				this.cachedVersions = versions;
				this.initialized = true;
				await this.run();
			}
		).catch(
			error => {
				VersionFeedTask.logger.error( error );
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

			await NewsUtil.publishMessage( versionFeedMessage );

			try {
				await versionFeedMessage.react( this.versionFeedEmoji );
			} catch ( error ) {
				VersionFeedTask.logger.error( error );
			}
		}

		this.cachedVersions = currentVersions;
	}

	private async getVersions(): Promise<JiraVersion[]> {
		let versions: JiraVersion[] = [...this.cachedVersions];

		for ( const project of this.projects ) {
			versions = await this.updateVersionsForProject( project, versions );
		}

		return versions;
	}

	private async updateVersionsForProject( project: string, versions: JiraVersion[] ): Promise<JiraVersion[]> {
		const results = await this.jira.project.getVersionsPaginated( {
			projectIdOrKey: project,
			maxResults: this.scope,
			orderBy: '-sequence',
		} );

		for ( const value of results.values ) {
			const version: JiraVersion = {
				id: value.id,
				name: value.name,
				archived: value.archived,
				released: value.released,
				releaseDate: value.releaseDate,
				project,
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

	private async getVersionEmbed( version: JiraVersion ): Promise<MessageEmbed> {
		const embed = new MessageEmbed()
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

		if ( this.projects.length > 1 ) {
			embed.addField( 'Project', version.project, true );
		}

		if ( !embed.fields?.length ) {
			return undefined;
		}

		return embed;
	}
}
