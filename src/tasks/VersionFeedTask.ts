import { Channel, MessageEmbed, TextChannel } from 'discord.js';
import * as log4js from 'log4js';
import { VersionFeedConfig } from '../BotConfig';
import { NewsUtil } from '../util/NewsUtil';
import MojiraBot from '../MojiraBot';
import Task from './Task';
import { LoggerUtil } from '../util/LoggerUtil';

interface JiraVersion {
	id: string;
	name: string;
	archived: boolean;
	released: boolean;
	releaseDate?: string;
	project: string;
}

export type VersionChangeType = 'created' | 'released' | 'unreleased' | 'archived' | 'unarchived' | 'renamed';

interface JiraVersionChange {
	type: VersionChangeType;
	versionId: string;
	message: string;
	embed?: MessageEmbed;
}

interface JiraVersionMap {
	[id: string]: JiraVersion;
}

export default class VersionFeedTask extends Task {
	private static logger = log4js.getLogger( 'VersionFeedTask' );

	private channel: Channel;
	private projects: string[];
	private versionFeedEmoji: string;
	private scope: number;
	private actions: VersionChangeType[];
	private publish: boolean;

	private cachedVersions: JiraVersionMap = {};

	constructor( feedConfig: VersionFeedConfig, channel: Channel ) {
		super();

		this.channel = channel;
		this.projects = feedConfig.projects;
		this.versionFeedEmoji = feedConfig.versionFeedEmoji;
		this.scope = feedConfig.scope;
		this.actions = feedConfig.actions;
		this.publish = feedConfig.publish ?? false;
	}

	protected async init(): Promise<void> {
		try {
			for ( const project of this.projects ) {
				const results = await MojiraBot.jira.projectVersions.getProjectVersions( {
					projectIdOrKey: project,
					expand: 'id,name,archived,released',
				} );

				for ( const value of results ) {
					this.cachedVersions[value.id] = {
						id: value.id,
						name: value.name,
						archived: value.archived,
						released: value.released,
						releaseDate: value.releaseDate,
						project,
					};
				}
			}
		} catch ( error ) {
			// If any request fails, our cache cannot be used. Return error.
			this.cachedVersions = {};
			throw error;
		}
	}

	protected async run(): Promise<void> {
		if ( !( this.channel instanceof TextChannel ) ) {
			VersionFeedTask.logger.error( `[${ this.id }] Expected ${ this.channel } to be a TextChannel` );
			return;
		}

		const changes = await this.getAllVersionChanges();
		VersionFeedTask.logger.debug( `[${ this.id }] Gotten ${ changes.length } relevant version changes: ${ VersionFeedTask.stringifyChanges( changes ) }` );

		for ( const change of changes ) {
			try {
				const versionFeedMessage = await this.channel.send( change.message, change.embed );

				if ( this.publish ) {
					await NewsUtil.publishMessage( versionFeedMessage );
				}

				if ( this.versionFeedEmoji !== undefined ) {
					await versionFeedMessage.react( this.versionFeedEmoji );
				}
			} catch ( error ) {
				VersionFeedTask.logger.error( `[${ this.id }] Could not send Discord message`, error );
			}
		}
	}

	private async getAllVersionChanges(): Promise<JiraVersionChange[]> {
		const changes: JiraVersionChange[] = [];

		for ( const project of this.projects ) {
			changes.push( ...await this.getVersionChangesForProject( project ) );
		}

		return changes.filter( change => this.actions.includes( change.type ) );
	}

	private async getVersionChangesForProject( project: string ): Promise<JiraVersionChange[]> {
		const results = await MojiraBot.jira.projectVersions.getProjectVersionsPaginated( {
			projectIdOrKey: project,
			maxResults: this.scope,
			orderBy: '-sequence',
		} );

		VersionFeedTask.logger.debug( `[${ this.id }] Received ${ results.values.length } versions for project ${ project }` );

		const changes: JiraVersionChange[] = [];

		for ( const value of results.values ) {
			try {
				const version: JiraVersion = {
					id: value.id,
					name: value.name,
					archived: value.archived,
					released: value.released,
					releaseDate: value.releaseDate,
					project,
				};

				const versionChanges = await this.getVersionChanges( this.cachedVersions[value.id], version );

				if ( versionChanges.length ) {
					this.cachedVersions[value.id] = version;
					changes.push( ...versionChanges );
				}
			} catch ( error ) {
				VersionFeedTask.logger.error( error );
			}
		}

		VersionFeedTask.logger.debug( `[${ this.id }] Found ${ changes.length } version changes for project ${ project }: ${ VersionFeedTask.stringifyChanges( changes ) }` );

		return changes;
	}

	private async getVersionChanges( previous: JiraVersion, current: JiraVersion ): Promise<JiraVersionChange[]> {
		const changes: JiraVersionChange[] = [];

		if ( previous === undefined ) {
			changes.push( {
				type: 'created',
				versionId: current.id,
				message: `Version **${ current.name }** has been created.`,
			} );
		} else {
			if ( previous.name !== current.name ) {
				changes.push( {
					type: 'renamed',
					versionId: current.id,
					message: `Version **${ previous.name }** has been renamed to **${ current.name }**.`,
				} );
			}

			if ( previous.archived !== current.archived ) {
				if ( current.archived ) {
					changes.push( {
						type: 'archived',
						versionId: current.id,
						message: `Version **${ current.name }** has been archived.`,
					} );
				} else {
					changes.push( {
						type: 'unarchived',
						versionId: current.id,
						message: `Version **${ current.name }** has been unarchived.`,
					} );
				}
			}

			if ( previous.released !== current.released ) {
				if ( current.released ) {
					changes.push( {
						type: 'released',
						versionId: current.id,
						message: `Version **${ current.name }** has been released.`,
					} );
				} else {
					changes.push( {
						type: 'unreleased',
						versionId: current.id,
						message: `Version **${ current.name }** has been unreleased.`,
					} );
				}
			}
		}

		const versionEmbed = await this.getVersionEmbed( current );
		for ( const change of changes ) {
			change.embed = versionEmbed;
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
			versionIssueCounts = await MojiraBot.jira.projectVersions.getVersionsRelatedIssuesCount( {
				id: version.id,
			} );
		} catch ( error ) {
			VersionFeedTask.logger.error( LoggerUtil.shortenJiraError( error ) );
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

	private static stringifyChanges( changes: JiraVersionChange[] ): string {
		return `[${ changes.map( change => `${ change.type }:${ change.versionId }` ).join( ',' ) }]`;
	}

	public asString(): string {
		return `VersionFeedTask[#${ this.id }]`;
	}
}
