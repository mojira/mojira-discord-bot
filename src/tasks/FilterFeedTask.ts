import { MentionRegistry } from '../mentions/MentionRegistry';
import { FilterFeedConfig } from '../BotConfig';
import { AnyChannel } from 'discord.js';
import * as log4js from 'log4js';
import Task from './Task';
import { NewsUtil } from '../util/NewsUtil';
import MojiraBot from '../MojiraBot';
import { LoggerUtil } from '../util/LoggerUtil';

export default class FilterFeedTask extends Task {
	private static logger = log4js.getLogger( 'FilterFeedTask' );

	private channel: AnyChannel;
	private jql: string;
	private filterFeedEmoji: string;
	private title: string;
	private titleSingle: string;
	private publish: boolean;

	private lastRun: number;

	constructor( feedConfig: FilterFeedConfig, channel: AnyChannel ) {
		super();

		this.channel = channel;
		this.jql = feedConfig.jql;
		this.filterFeedEmoji = feedConfig.filterFeedEmoji;
		this.title = feedConfig.title;
		this.titleSingle = feedConfig.titleSingle || feedConfig.title.replace( /\{\{num\}\}/g, '1' );
		this.publish = feedConfig.publish ?? false;
	}

	protected async init(): Promise<void> {
		this.lastRun = new Date().valueOf();
	}

	protected async run(): Promise<void> {
		if ( !this.channel.isText() ) {
			FilterFeedTask.logger.error( `[${ this.id }] Expected ${ this.channel } to be a TextChannel` );
			return;
		}

		let unknownTickets: string[];

		try {
			const searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJql( {
				jql: this.jql.replace( 'lastRun', this.lastRun.toString() ),
				fields: ['key'],
			} );

			if ( !searchResults.issues ) {
				FilterFeedTask.logger.error( `[${ this.id }] Error: no issues returned by JIRA` );
				return;
			}

			unknownTickets = searchResults.issues.map( ( { key } ) => key );
		} catch ( err ) {
			FilterFeedTask.logger.error( `[${ this.id }] Error when searching for issues. ${ LoggerUtil.shortenJiraError( err ) }` );
			return;
		}

		if ( unknownTickets.length > 0 ) {
			try {
				const embed = await MentionRegistry.getMention( unknownTickets ).getEmbed();

				let message = '';

				if ( unknownTickets.length > 1 ) {
					embed.setTitle(
						this.title.replace( /\{\{num\}\}/g, unknownTickets.length.toString() )
					);
				} else {
					message = this.titleSingle;
				}

				const filterFeedMessage = await this.channel.send( { content: message, embeds: [embed] } );

				if ( this.publish ) {
					await NewsUtil.publishMessage( filterFeedMessage );
				}

				if ( this.filterFeedEmoji !== undefined ) {
					await filterFeedMessage.react( this.filterFeedEmoji );
				}
			} catch ( error ) {
				FilterFeedTask.logger.error( `[${ this.id }] Could not send Discord message`, error );
				return;
			}
		}

		this.lastRun = new Date().valueOf();
	}

	public asString(): string {
		return `FilterFeedTask[#${ this.id }]`;
	}
}
