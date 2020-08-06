import * as log4js from 'log4js';
import Task from './Task';
import { Channel, TextChannel, RichEmbed } from 'discord.js';
import { VersionFeedConfig } from '../BotConfig';
import { NewsUtil } from '../util/NewsUtil';
import MojiraBot from '../MojiraBot';

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

export default class VersionFeedTask extends Task {
	public static logger = log4js.getLogger( 'Version' );

	private channel: Channel;
	private project: string;
	private scope: number;

	private cachedVersions: JiraVersion[] = [];

	private initialized = false;

	constructor( { project, scope }: VersionFeedConfig, channel: Channel ) {
		super();

		this.channel = channel;
		this.project = project;
		this.scope = scope;

		this.getVersions().then(
			versions => {
				this.cachedVersions = versions;
				this.cachedVersions = [
					{ id: '19578', name: 'Future Version - 1.16', archived: false, released: false, releaseDate: undefined },
					{ id: '19576', name: '1.16.2 Pre-release -2', archived: false, released: false, releaseDate: '2020-08-05' },
					{ id: '19574', name: '1.16.2 Pre-release -999', archived: false, released: true, releaseDate: '2020-07-29' },
					{ id: '19570', name: '20w30a', archived: true, released: true, releaseDate: '2020-07-22' },
					{ id: '19559', name: '20w29a', archived: true, released: true, releaseDate: '2020-07-15' },
				];
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
		VersionFeedTask.logger.debug( 'run versionfeedtask' );
		if ( !this.initialized ) return;
		VersionFeedTask.logger.debug( 'run versionfeedtask 2' );

		if ( !( this.channel instanceof TextChannel ) ) {
			VersionFeedTask.logger.error( `Expected ${ this.channel } to be a TextChannel` );
			return;
		}

		const currentVersions = await this.getVersions();
		const changes = await this.getVersionChanges( this.cachedVersions, currentVersions );

		for ( const change of changes ) {
			const versionFeedMessage = await this.channel.send( change.message, change.embed );
			NewsUtil.publishMessage( versionFeedMessage );
		}

		this.cachedVersions = currentVersions;
	}

	private async getVersions(): Promise<JiraVersion[]> {
		const results = await MojiraBot.jira.projectVersions.getProjectVersionsPaginated( {
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

		VersionFeedTask.logger.debug( 'Getting version changes' );

		for ( const version of current ) {
			const previousVersion = previous.find( it => it.id === version.id );

			if ( previousVersion !== undefined ) {
				if ( previousVersion.name !== version.name ) {
					changes.push( {
						message: `Version **${ previousVersion.name }** has been renamed to **${ version.name }**.`,
						embed: await this.getVersionEmbed( version ),
					} );
				}
				if ( previousVersion.archived !== version.archived ) {
					changes.push( {
						message: `Version **${ version.name }** has been ${ version.archived ? '' : 'un' }archived.`,
						embed: await this.getVersionEmbed( version ),
					} );
				}
				if ( previousVersion.released !== version.released ) {
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
			versionIssueCounts = await MojiraBot.jira.projectVersions.getVersionsRelatedIssuesCount( {
				id: version.id,
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