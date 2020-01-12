import { MentionRegistry } from '../mentions/MentionRegistry';
import { FilterFeedConfig } from '../BotConfig';
import { Client, TextChannel, Channel } from 'discord.js';
import * as log4js from 'log4js';
import Task from './Task';
import JiraClient = require( 'jira-connector' );

export default class FilterFeedTask extends Task {
	public static logger = log4js.getLogger( 'FilterFeed' );

	private client: Client;
	private jira: JiraClient;
	private channel: Channel;
	private jql: string;
	private title: string;

	private knownTickets: Set<string>;

	constructor( { jql, title }: FilterFeedConfig, channel: Channel ) {
		super();

		this.channel = channel;
		this.jql = jql;
		this.title = title;

		this.jira = new JiraClient( {
			host: 'bugs.mojang.com',
			strictSSL: true,
		} );
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
		}
		catch ( err ) {
			FilterFeedTask.logger.error( err );
			return;
		}

		if ( this.knownTickets ) {
			const unknownTickets = upcomingTickets.filter( key => !this.knownTickets.has( key ) );

			if ( unknownTickets.length > 0 ) {
				try {
					const embed = await MentionRegistry.getMention( unknownTickets ).getEmbed();
					embed
						.setTitle(
							this.title
								.replace( /\{\{num\}\}/g, unknownTickets.length.toString() )
						)
						.setTimestamp( new Date() );

					if ( this.channel instanceof TextChannel ) {
						this.channel.send( embed );
					}
					else {
						throw `Expected ${this.channel} to be a TextChannel`;
					}
				}
				catch ( err ) {
					FilterFeedTask.logger.error( err );
					return;
				}
			}
		}
		for (const ticket of upcomingTickets) {
			this.knownTickets.add( ticket );
		}
	}
}
