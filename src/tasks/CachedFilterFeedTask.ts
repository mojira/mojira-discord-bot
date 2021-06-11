import { MentionRegistry } from '../mentions/MentionRegistry';
import { FilterFeedConfig } from '../BotConfig';
import { TextChannel, Channel } from 'discord.js';
import * as log4js from 'log4js';
import Task from './Task';
import { NewsUtil } from '../util/NewsUtil';
import MojiraBot from '../MojiraBot';

export default class CachedFilterFeedTask extends Task {
	private static logger = log4js.getLogger( 'CachedFilterFeedTask' );

	private channel: Channel;
	private jql: string;
	private jqlRemoved: string;
	private filterFeedEmoji: string;
	private title: string;
	private titleSingle: string;
	private publish: boolean;

	private knownTickets = new Set<string>();

	private	lastRun: number;

	constructor( feedConfig: FilterFeedConfig, channel: Channel ) {
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

		const searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJqlGet( {
			jql: this.jql.replace( 'lastRun', this.lastRun.toString() ),
			fields: ['key'],
		} );

		if ( searchResults.issues ) {
			for ( const result of searchResults.issues ) {
				this.knownTickets.add( result.key );
			}
		}
	}

	protected async run(): Promise<void> {
		if ( !( this.channel instanceof TextChannel ) ) {
			CachedFilterFeedTask.logger.error( `[${ this.id }] Expected ${ this.channel } to be a TextChannel` );
			return;
		}

		let upcomingTickets: string[];

		try {
			const searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJqlGet( {
				jql: this.jql.replace( 'lastRun', this.lastRun.toString() ),
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

		let removableTickets: string[];

		try {
			const ticketKeys = Array.from( this.knownTickets );
			const previousTicketResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJqlGet( {
				jql: `${ this.jqlRemoved.replace( 'lastRun', this.lastRun.toString() ) } AND key in (${ ticketKeys.join( ',' ) })`,
				fields: ['key'],
			} );

			if ( !previousTicketResults.issues ) {
				CachedFilterFeedTask.logger.debug( 'No issues returned by JIRA' );
			}

			removableTickets = previousTicketResults.issues.map( ( { key } ) => key );
		} catch ( err ) {
			CachedFilterFeedTask.logger.error( err );
			return;
		}

		for ( const ticket of removableTickets ) {
			this.knownTickets.delete( ticket );
			CachedFilterFeedTask.logger.debug( `Removed ${ ticket } from known tickets for cached filter feed task ${ this.id }` );
		}

		const unknownTickets = upcomingTickets.filter( key => !this.knownTickets.has( key ) );

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

				const filterFeedMessage = await this.channel.send( message, embed );

				if ( this.publish ) {
					await NewsUtil.publishMessage( filterFeedMessage );
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
