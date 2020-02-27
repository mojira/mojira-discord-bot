import BotConfig, { FilterFeedConfig } from '../BotConfig';
import { Client, TextChannel, Channel, RichEmbed } from 'discord.js';
import * as log4js from 'log4js';
import Task from './Task';
import JiraClient = require( 'jira-connector' );
import { EmbedConfig } from '../MentionConfig';
import { CustomMention } from '../mentions/CustomMention';
import { MultipleMention } from '../mentions/MultipleMention';

export default class FilterFeedTask extends Task {
	public static logger = log4js.getLogger( 'FilterFeed' );

	private client: Client;
	private jira: JiraClient;
	private channel: Channel;
	private jql: string;
	private title: string;
	private embed: EmbedConfig;
	private maxUngroupedMentions: number;
	private maxGroupedMentions: number;
	private titleSingle: string;

	private knownTickets = new Set<string>();

	constructor( { jql, title, embed, maxUngroupedMentions: maxUngroupedMentions, maxGroupedMentions: maxGroupedMentions, titleSingle: titleSingle }: FilterFeedConfig, channel: Channel ) {
		super();

		this.channel = channel;
		this.jql = jql;
		this.title = title;
		this.embed = embed;
		this.maxUngroupedMentions = maxUngroupedMentions || BotConfig.maxUngroupedMentions;
		this.maxGroupedMentions = maxGroupedMentions || BotConfig.maxGroupedMentions;
		this.titleSingle = titleSingle || title.replace( /\{\{num\}\}/g, '1' );

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
		} catch ( err ) {
			FilterFeedTask.logger.error( err );
			return;
		}

		if ( this.knownTickets ) {
			const unknownTickets = upcomingTickets.filter( key => !this.knownTickets.has( key ) );

			if ( unknownTickets.length > 0 ) {
				try {
					let message = '';
					const embeds = new Array<RichEmbed>();

					if ( unknownTickets.length > 1 ) {
						const getTitle = (): string => this.title.replace( /\{\{num\}\}/g, unknownTickets.length.toString() );

						if ( unknownTickets.length > this.maxUngroupedMentions ) {
							const embed = await new MultipleMention( unknownTickets, this.maxGroupedMentions ).getEmbed();
							embed.setTitle( getTitle() );
							embeds.push( embed );
						} else {
							message = getTitle();
							for( const ticket of unknownTickets ) {
								embeds.push( await new CustomMention ( ticket, this.embed ).getEmbed() );
							}
						}
					} else {
						message = this.titleSingle;
						embeds.push( await new CustomMention ( unknownTickets[ 0 ], this.embed ).getEmbed() );
					}

					if ( this.channel instanceof TextChannel ) {
						this.channel.send( message, embeds [ 0 ] );
						if ( embeds.length > 1 ) {
							for ( const embed of embeds.splice( 0, embeds.length ) ) {
								this.channel.send( embed );
							}
						}
					} else {
						throw `Expected ${ this.channel } to be a TextChannel`;
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
