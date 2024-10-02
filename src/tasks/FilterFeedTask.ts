import { MentionRegistry } from '../mentions/MentionRegistry.js';
import { FilterFeedConfig } from '../BotConfig.js';
import { Message, SendableChannels } from 'discord.js';
import log4js from 'log4js';
import Task from './Task.js';
import { NewsUtil } from '../util/NewsUtil.js';
import MojiraBot from '../MojiraBot.js';
import { LoggerUtil } from '../util/LoggerUtil.js';

export default class FilterFeedTask extends Task {
	private static logger = log4js.getLogger( 'FilterFeedTask' );
	private static lastRunRegex = /\{\{lastRun\}\}/g;

	private channel: SendableChannels;
	private jql: string;
	private filterFeedEmoji: string;
	private title: string;
	private titleSingle: string;
	private publish: boolean;

	private lastRun: number;

	constructor( feedConfig: FilterFeedConfig, channel: SendableChannels ) {
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
		let unknownTickets: string[];

		try {
			const searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJql( {
				jql: this.jql.replace( FilterFeedTask.lastRunRegex, this.lastRun.toString() ),
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
				const embed = await MentionRegistry.getMention( unknownTickets, this.channel ).getEmbed();

				let filterFeedMessage: Message;

				if ( unknownTickets.length > 1 ) {
					embed.setTitle(
						this.title.replace( /\{\{num\}\}/g, unknownTickets.length.toString() )
					);
					filterFeedMessage = await this.channel.send( { embeds: [embed] } );
				} else {
					filterFeedMessage = await this.channel.send( { content: this.titleSingle, embeds: [embed] } );
				}

				if ( this.publish ) {
					NewsUtil.publishMessage( filterFeedMessage ).catch( err => {
						FilterFeedTask.logger.error( `[${ this.id }] Error when publishing message`, err );
					} );
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
