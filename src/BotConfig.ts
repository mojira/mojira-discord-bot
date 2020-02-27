import { Client } from 'discord.js';
import MojiraBot from './MojiraBot';
import MentionConfig, { EmbedConfig } from './MentionConfig';

export interface RoleConfig {
	emoji: string;
	desc: string;
	id: string;
}

export interface FilterFeedConfig {
	jql: string;
	channel: string;
	title: string;
	embed: EmbedConfig;
	maxUngroupedMentions?: number;
	maxGroupedMentions?: number;
	titleSingle?: string;
}

export default class BotConfig {
	public static debug: boolean;

	private static token: string;
	public static owner: string;

	// Add map of id => GuildConfiguration here later
	// These three settings will be moved over to `GuildConfiguration` later
	public static homeChannel: string;
	public static rolesChannel: string;
	public static rolesMessage: string;
	public static requestChannels: string[];

	private static embedTypes: Map<string, EmbedConfig>;
	public static mentionTypes: MentionConfig[];
	public static maxUngroupedMentions?: number;
	public static maxGroupedMentions?: number;

	public static projects: Array<string>;

	public static roles: RoleConfig[];

	public static filterFeedInterval: number;
	public static filterFeeds: FilterFeedConfig[];

	// projects etc
	// wrapper class for settings.json

	public static init( settingsJson: string ): void {
		const settings = JSON.parse( settingsJson );

		if ( !settings ) throw 'Settings could not be parsed';

		if ( !settings.debug ) this.debug = false;
		else this.debug = settings.debug;

		if ( !settings.token ) throw 'Token is not set';
		this.token = settings.token;

		if ( !settings.owner ) throw 'Owner is not set';
		this.owner = settings.owner;

		if ( !settings.home_channel ) throw 'Home channel is not set';
		this.homeChannel = settings.home_channel;

		if ( !settings.roles_channel ) throw 'Roles channel is not set';
		this.rolesChannel = settings.roles_channel;

		if ( !settings.roles_message ) throw 'Roles message is not set';
		this.rolesMessage = settings.roles_message;

		if ( !settings.request_channels ) throw 'Request channels are not set';
		this.requestChannels = settings.request_channels;

		if ( !settings.embed_types ) throw 'Embed Types are not defined!';
		this.embedTypes = new Map<string, EmbedConfig>();
		Object.keys( settings.embed_types ).forEach( ( key: string ) => {
			this.embedTypes.set( key, new EmbedConfig( settings.embed_types[key] ) );
		} );

		if ( !( settings.mention_types instanceof Array ) ) throw 'Mention Types are not defined!';
		this.mentionTypes = new Array<MentionConfig>();

		for ( const mentionType of settings.mention_types ) {
			this.mentionTypes.push( new MentionConfig( mentionType, this.embedTypes ) );
		}

		if( settings.max_grouped_mentions === undefined ) throw 'Max ungrouped mentions are not defined!';
		this.maxUngroupedMentions = settings.max_ungrouped_mentions as number;

		if( settings.max_grouped_mentions === undefined ) throw 'Max grouped mentions are not defined!';
		this.maxGroupedMentions = settings.max_grouped_mentions as number;

		if ( !settings.projects ) throw 'Projects are not set';
		this.projects = settings.projects;

		if ( !settings.roles ) throw 'Roles are not set';
		this.roles = settings.roles;

		if ( !settings.filter_feed_interval ) throw 'Filter feed interval is not set';
		this.filterFeedInterval = settings.filter_feed_interval;

		if ( !settings.filter_feeds ) throw 'Filter feeds are not set';
		this.filterFeeds = new Array<FilterFeedConfig>();

		for( const filterFeed of settings.filter_feeds ) {
			if( !filterFeed.embed ) throw 'A filter feed has no embed.';
			const feed = {};

			Object.keys( filterFeed ).forEach( key => {
				const camelCaseKey = key.replace( /_./g, match => match.substring( 1, 2 ).toUpperCase() );
				feed[ camelCaseKey ] = filterFeed[ key ];

			} );

			feed[ 'embed' ] = this.embedTypes.get( filterFeed.embed );
			if( !feed[ 'embed' ] ) throw `A filter feed has an undefined embed: ${ filterFeed.embed }`;

			this.filterFeeds.push( feed as FilterFeedConfig );
		}
	}

	public static async login( client: Client ): Promise<boolean> {
		try {
			await client.login( this.token );
		} catch ( err ) {
			MojiraBot.logger.error( err );
			return false;
		}
		return true;
	}
}
