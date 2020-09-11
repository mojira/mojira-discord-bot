import { MentionRegistry } from '../mentions/MentionRegistry';
import { FilterFeedConfig } from '../BotConfig';
import { TextChannel, Channel } from 'discord.js';
import * as log4js from 'log4js';
import Task from './Task';
import JiraClient from 'jira-connector';
import { NewsUtil } from '../util/NewsUtil';

export default class FilterFeedTask extends Task {
	private static logger = log4js.getLogger( 'FilterFeedTask' );

	private jira: JiraClient;
	private channel: Channel;
	private jql: string;
	private title: string;
	private titleSingle: string;
	private filterFeedEmoji: string;

	private knownTickets = new Set<string>();

	constructor( { jql, title, titleSingle, filterFeedEmoji }: FilterFeedConfig, channel: Channel ) {
		super();

		this.channel = channel;
		this.jql = jql;
		this.title = title;
		this.filterFeedEmoji = filterFeedEmoji;
		this.titleSingle = titleSingle || title.replace( /\{\{num\}\}/g, '1' );

		this.jira = new JiraClient( {
			host: 'bugs.mojang.com',
			strictSSL: true,
		} );

		this.run().catch( FilterFeedTask.logger.error );
	}

	public async run(): Promise<void> {
		let upcomingTickets: string[];

		try {
			const searchResults = await this.jira.search.search( {
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

		if ( this.knownTickets ) {
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
						const filterFeedMessage = await this.channel.send( message, embed );

						await NewsUtil.publishMessage( filterFeedMessage );

						if ( this.filterFeedEmoji !== undefined ) {
							try {
								await filterFeedMessage.react( this.filterFeedEmoji );
							} catch ( error ) {
								FilterFeedTask.logger.error( error );
							}
						}
					} else {
						throw new Error( `Expected ${ this.channel } to be a TextChannel` );
					}
				} catch ( err ) {
					FilterFeedTask.logger.error( err );
					return;
				}
			}
		}
		for ( const ticket of upcomingTickets ) {
			this.knownTickets.add( ticket );
		}
	}
}
