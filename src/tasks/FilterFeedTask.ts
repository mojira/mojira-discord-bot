import BotConfig, { FilterFeedConfig } from '../BotConfig';
import { Client, TextChannel, DMChannel, GroupDMChannel } from 'discord.js';
import * as log4js from 'log4js';
import Task from './Task';
import JiraClient = require( 'jira-connector' );
import { EmbedConfig } from '../MentionConfig';
import MentionUtil from '../util/MentionUtil';

export default class FilterFeedTask extends Task {
	public static logger = log4js.getLogger( 'FilterFeed' );

	private client: Client;
	private jira: JiraClient;
	private channel: TextChannel | DMChannel | GroupDMChannel;
	private jql: string;
	private title: string;
	private embed: EmbedConfig;
	private maxUngroupedMentions: number;
	private maxGroupedMentions: number;
	private titleSingle: string;

	private knownTickets = new Set<string>();

	constructor( { jql, title, embed, maxUngroupedMentions, maxGroupedMentions, titleSingle }: FilterFeedConfig, channel: TextChannel | DMChannel | GroupDMChannel ) {
		super();

		this.channel = channel;
		this.jql = jql;
		this.title = title;
		this.embed = embed;
		this.maxUngroupedMentions = maxUngroupedMentions !== undefined ? maxUngroupedMentions : BotConfig.maxUngroupedMentions;
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
					const mentions = MentionUtil.getMentions( unknownTickets, this.embed, this.maxUngroupedMentions, this.maxGroupedMentions );
					MentionUtil.sendMentions( mentions, this.channel, undefined, unknownTickets.length == 1 ? this.titleSingle : this.title.replace( '{{num}}', unknownTickets.length.toString() ) );

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
