import { MentionRegistry } from '../mentions/MentionRegistry.js';
import { FilterFeedConfig } from '../BotConfig.js';
import { Message, SendableChannels } from 'discord.js';
import log4js from 'log4js';
import Task from './Task.js';
import { NewsUtil } from '../util/NewsUtil.js';
import MojiraBot from '../MojiraBot.js';

export default class CachedFilterFeedTask extends Task {
	private static logger = log4js.getLogger( 'CachedFilterFeedTask' );
	private static lastRunRegex = /\{\{lastRun\}\}/g;

	private channel: SendableChannels;
	private jql: string;
	private jqlRemoved?: string;
	private filterFeedEmoji: string;
	private title: string;
	private titleSingle: string;
	private publish: boolean;

	private knownTickets = new Set<string>();

	private	lastRun: number;

	constructor( feedConfig: FilterFeedConfig, channel: SendableChannels ) {
		super();

		this.channel = channel;
		this.jql = feedConfig.jql;
		this.jqlRemoved = feedConfig.jqlRemoved;
		this.filterFeedEmoji = feedConfig.filterFeedEmoji;
		this.title = feedConfig.title;
		this.titleSingle = feedConfig.titleSingle || feedConfig.title.replace( /\{\{num\}\}/g, '1' );
		this.publish = feedConfig.publish ?? false;
	}

	protected async init(): Promise<void> {
		this.lastRun = new Date().valueOf();

		const searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJql( {
			jql: this.jql.replace( CachedFilterFeedTask.lastRunRegex, this.lastRun.toString() ),
			fields: ['key'],
		} );

		if ( searchResults.issues ) {
			for ( const result of searchResults.issues ) {
				this.knownTickets.add( result.key );
			}
		}
	}

	protected async run(): Promise<void> {
		let upcomingTickets: string[];

		try {
			const searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJql( {
				jql: this.jql.replace( CachedFilterFeedTask.lastRunRegex, this.lastRun.toString() ),
				fields: ['key'],
			} );

			if ( !searchResults.issues ) {
				CachedFilterFeedTask.logger.error( `[${ this.id }] Error: no issues returned by JIRA` );
				return;
			}

			upcomingTickets = searchResults.issues.map( ( { key } ) => key );
		} catch ( err ) {
			CachedFilterFeedTask.logger.error( `[${ this.id }] Error when searching for issues`, err );
			return;
		}

		if ( this.jqlRemoved !== undefined ) {
			try {
				const ticketKeys = Array.from( this.knownTickets );
				const previousTicketResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJql( {
					jql: `${ this.jqlRemoved.replace( CachedFilterFeedTask.lastRunRegex, this.lastRun.toString() ) } AND key in (${ ticketKeys.join( ',' ) })`,
					fields: ['key'],
				} );

				let removableTickets: string[] = [];

				if ( previousTicketResults?.issues ) {
					removableTickets = previousTicketResults.issues.map( ( { key } ) => key );
				} else {
					CachedFilterFeedTask.logger.debug( 'No issues returned by JIRA' );
				}

				for ( const ticket of removableTickets ) {
					this.knownTickets.delete( ticket );
					CachedFilterFeedTask.logger.debug( `Removed ${ ticket } from known tickets for cached filter feed task ${ this.id }` );
				}
			} catch ( err ) {
				CachedFilterFeedTask.logger.error( err );
				return;
			}
		}

		const unknownTickets = upcomingTickets.filter( key => !this.knownTickets.has( key ) );

		if ( unknownTickets.length > 0 ) {
			try {
				const embed = await MentionRegistry.getMention( unknownTickets, this.channel ).getEmbed();

				let message = '';

				let filterFeedMessage: Message;

				if ( unknownTickets.length > 1 ) {
					embed.setTitle(
						this.title.replace( /\{\{num\}\}/g, unknownTickets.length.toString() )
					);
					filterFeedMessage = await this.channel.send( { embeds: [embed] } );
				} else {
					message = this.titleSingle;
					filterFeedMessage = await this.channel.send( { content: message, embeds: [embed] } );
				}

				if ( this.publish ) {
					NewsUtil.publishMessage( filterFeedMessage ).catch( err => {
						CachedFilterFeedTask.logger.error( `[${ this.id }] Error when publishing message`, err );
					} );
				}

				if ( this.filterFeedEmoji !== undefined ) {
					await filterFeedMessage.react( this.filterFeedEmoji );
				}
			} catch ( error ) {
				CachedFilterFeedTask.logger.error( `[${ this.id }] Could not send Discord message`, error );
				return;
			}
		}

		this.lastRun = new Date().valueOf();

		for ( const ticket of unknownTickets ) {
			this.knownTickets.add( ticket );
			CachedFilterFeedTask.logger.debug( `[${ this.id }] Added ${ ticket } to known tickets for cached filter feed task ${ this.id }` );
		}
	}

	public asString(): string {
		return `CachedFilterFeedTask[#${ this.id }]`;
	}
}
