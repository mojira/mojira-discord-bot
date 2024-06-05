import { EmbedBuilder, TextBasedChannel } from 'discord.js';
import log4js from 'log4js';
import { VersionConfig, VersionFeedConfig } from '../BotConfig.js';
import { NewsUtil } from '../util/NewsUtil.js';
import MojiraBot from '../MojiraBot.js';
import Task from './Task.js';
import { LoggerUtil } from '../util/LoggerUtil.js';
import { Version } from 'jira.js/out/version2/models';

interface JiraVersion {
	id: string;
	name: string;
	archived: boolean;
	released: boolean;
	releaseDate?: string;
	projectId: number;
}

function versionConv( version: Version ): JiraVersion | undefined {
	if (
		version.id === undefined
		|| version.name === undefined
		|| version.archived === undefined
		|| version.released === undefined
		|| version.projectId === undefined
	) return undefined;

	return {
		id: version.id,
		name: version.name,
		archived: version.archived,
		released: version.released,
		releaseDate: version.releaseDate,
		projectId: version.projectId,
	};
}

export type VersionChangeType = 'created' | 'released' | 'unreleased' | 'archived' | 'unarchived' | 'renamed';

interface JiraVersionChange {
	type: VersionChangeType;
	versionId: string;
	message: string;
	embed?: EmbedBuilder;
}

interface JiraVersionMap {
	[id: string]: JiraVersion;
}

export default class VersionFeedTask extends Task {
	private static logger = log4js.getLogger( 'VersionFeedTask' );

	private channel: TextBasedChannel;
	private projects: VersionConfig[];
	private versionFeedEmoji: string;
	private scope: number;
	private actions: VersionChangeType[];
	private publish: boolean;

	private cachedVersions: JiraVersionMap = {};

	constructor( feedConfig: VersionFeedConfig, channel: TextBasedChannel ) {
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
					projectIdOrKey: project.name,
					expand: 'id,name,archived,released',
				} );

				for ( const value of results ) {
					const version = versionConv( value );
					if ( version !== undefined ) this.cachedVersions[version.id] = version;
				}
			}
		} catch ( error ) {
			// If any request fails, our cache cannot be used. Return error.
			this.cachedVersions = {};
			throw error;
		}
	}

	protected async run(): Promise<void> {
		const changes = await this.getAllVersionChanges();
		// VersionFeedTask.logger.debug( `[${ this.id }] Gotten ${ changes.length } relevant version changes: ${ VersionFeedTask.stringifyChanges( changes ) }` );

		for ( const change of changes ) {
			try {
				const embeds = change.embed === undefined ? [] : [change.embed];
				const versionFeedMessage = await this.channel.send( { content: change.message, embeds } );

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
			changes.push( ...await this.getVersionChangesForProject( project.name ) );
		}

		return changes.filter( change => this.actions.includes( change.type ) );
	}

	private async getVersionChangesForProject( project: string ): Promise<JiraVersionChange[]> {
		const results = await MojiraBot.jira.projectVersions.getProjectVersionsPaginated( {
			projectIdOrKey: project,
			maxResults: this.scope,
			orderBy: '-sequence',
		} );

		const changes: JiraVersionChange[] = [];

		// VersionFeedTask.logger.debug( `[${ this.id }] Received ${ results.values?.length } versions for project ${ project }` );
		if ( !results.values ) return changes;

		for ( const value of results.values ) {
			try {
				const version = versionConv( value );
				if ( version === undefined ) continue;

				const versionChanges = await this.getVersionChanges( this.cachedVersions[version.id], version );

				if ( versionChanges.length ) {
					this.cachedVersions[version.id] = version;
					changes.push( ...versionChanges );
				}
			} catch ( error ) {
				VersionFeedTask.logger.error( error );
			}
		}

		// VersionFeedTask.logger.debug( `[${ this.id }] Found ${ changes.length } version changes for project ${ project }: ${ VersionFeedTask.stringifyChanges( changes ) }` );

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

	private async getVersionEmbed( version: JiraVersion ): Promise<EmbedBuilder | undefined> {
		const embed = new EmbedBuilder()
			.setTitle( version.name )
			.setColor( 'Purple' );

		let versionIssueCounts: {
			issuesAffectedCount: number;
			issuesFixedCount: number;
		};

		try {
			versionIssueCounts = await MojiraBot.jira.projectVersions.getVersionRelatedIssues( {
				id: version.id,
			} );
		} catch ( error ) {
			VersionFeedTask.logger.error( `[${ this.id }] Error getting versionRelatedIssues: ${ LoggerUtil.shortenJiraError( error ) }` );
			return undefined;
		}

		const affectedIssues = versionIssueCounts.issuesAffectedCount;
		const fixedIssues = versionIssueCounts.issuesFixedCount;

		if ( affectedIssues > 0 ) {
			const affectedSearchQuery = `affectedVersion = ${ version.id } ORDER BY created ASC`;
			embed.addFields( {
				name: 'Affected',
				value: `[${ affectedIssues } issue${ affectedIssues > 1 ? 's' : '' }](https://bugs.mojang.com/issues/?jql=${ affectedSearchQuery.replace( /\s+/ig, '%20' ) })`,
				inline: true,
			} );
		}

		if ( fixedIssues > 0 ) {
			const fixedSearchQuery = `fixVersion = ${ version.id } ORDER BY key ASC`;
			embed.addFields( {
				name: 'Fixed',
				value: `[${ fixedIssues } issue${ fixedIssues > 1 ? 's' : '' }](https://bugs.mojang.com/issues/?jql=${ fixedSearchQuery.replace( /\s+/ig, '%20' ) })`,
				inline: true,
			} );
		}

		if ( version.releaseDate !== undefined ) {
			embed.addFields( {
				name: 'Released',
				value: version.releaseDate,
				inline: true,
			} );
		}

		const projectKey = this.projects.find( project => project.id == version.projectId )?.name;
		if ( projectKey ) {
			embed.addFields( {
				name: 'Project',
				value: projectKey,
				inline: true,
			} );
		}

		if ( !embed.data.fields?.length ) {
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
