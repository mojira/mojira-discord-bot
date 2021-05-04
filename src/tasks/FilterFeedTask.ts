import { MentionRegistry } from '../mentions/MentionRegistry';
import { FilterFeedConfig } from '../BotConfig';
import { TextChannel, Channel } from 'discord.js';
import * as log4js from 'log4js';
import Task from './Task';
import { NewsUtil } from '../util/NewsUtil';
import MojiraBot from '../MojiraBot';

export default class FilterFeedTask extends Task {
	private static logger = log4js.getLogger( 'FilterFeedTask' );
	private static maxId = 0;

	private channel: Channel;
	private jql: string;
	private jqlRemoved: string;
	private filterFeedEmoji: string;
	private title: string;
	private titleSingle: string;
	private publish: boolean;

	private knownTickets = new Set<string>();

	private initialized = false;
	private id = 0;

	constructor( feedConfig: FilterFeedConfig, channel: Channel ) {
		super();

		this.id = FilterFeedTask.maxId++;
		FilterFeedTask.logger.debug( `Initializing filter feed task ${ this.id } with settings ${ JSON.stringify( feedConfig ) }` );

		this.channel = channel;
		this.jql = feedConfig.jql;
		this.jqlRemoved = feedConfig.jqlRemoved;
		this.filterFeedEmoji = feedConfig.filterFeedEmoji;
		this.title = feedConfig.title;
		this.titleSingle = feedConfig.titleSingle || feedConfig.title.replace( /\{\{num\}\}/g, '1' );
		this.publish = feedConfig.publish ?? false;

		this.run().then(
			async () => {
				this.initialized = true;
				FilterFeedTask.logger.debug( `Filter feed task ${ this.id } has been initialized` );

				await this.run();
			}
		).catch( FilterFeedTask.logger.error );
	}

	public async run(): Promise<void> {
		if ( !this.initialized ) {
			FilterFeedTask.logger.debug( `Filter feed task ${ this.id } was run but did not execute because it has not been initialized yet` );
			return;
		}

		FilterFeedTask.logger.debug( `Running filter feed task ${ this.id }` );

		let upcomingTickets: string[];

		let reopenedTickets: string[];

		try {
			const searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJqlGet( {
				jql: this.jql,
				fields: ['key'],
			} );

			if ( !searchResults.issues ) {
				FilterFeedTask.logger.error( 'Error: no issues returned by JIRA' );
				return;
			}

			upcomingTickets = searchResults.issues.map( ( { key } ) => key );
		} catch ( err ) {
			FilterFeedTask.logger.error( err );
			return;
		}

		try {
			const ticketKeys = Array.from( this.knownTickets );
			const previousTicketResults = await this.jira.search.search( {
				jql: `${ this.jqlRemoved } AND key in (${ ticketKeys.join( ',' ) })`,
				fields: ['key'],
			} );

			if ( !previousTicketResults.issues ) {
				FilterFeedTask.logger.debug( 'No issues returned by JIRA' );
			}

			reopenedTickets = previousTicketResults.issues.map( ( { key } ) => key );
		} catch ( err ) {
			FilterFeedTask.logger.error( err );
			return;
		}

		for ( const ticket of reopenedTickets ) {
			this.knownTickets.delete( ticket );
			FilterFeedTask.logger.debug( `Removed ${ ticket } from known tickets for filter feed task ${ this.id }` );
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

				if ( this.channel instanceof TextChannel ) {
					try {
						const filterFeedMessage = await this.channel.send( message, embed );

						if ( this.publish ) {
							await NewsUtil.publishMessage( filterFeedMessage );
						}

						if ( this.filterFeedEmoji !== undefined ) {
							await filterFeedMessage.react( this.filterFeedEmoji );
						}
					} catch ( error ) {
						FilterFeedTask.logger.error( error );
					}
				} else {
					throw new Error( `Expected ${ this.channel } to be a TextChannel` );
				}
			} catch ( err ) {
				FilterFeedTask.logger.error( err );
				return;
			}
		}

		for ( const ticket of unknownTickets ) {
			this.knownTickets.add( ticket );
			FilterFeedTask.logger.debug( `Added ${ ticket } to known tickets for filter feed task ${ this.id }` );
		}
	}
}
