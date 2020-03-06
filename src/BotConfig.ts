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

export interface RequestConfig {
	channels?: string[];
	internal_channels?: string[];
	log_channel?: string;
	no_link_emoji?: string;
	no_link_warning_lifetime?: number;
	waiting_emoji?: string;
	suggested_emoji?: string[];
	resolve_delay?: number;
	prepend_response_message?: boolean;
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

	private static embedTypes: Map<string, EmbedConfig>;
	public static mentionTypes: MentionConfig[];
	public static defaultEmbed: EmbedConfig;
	public static maxUngroupedMentions?: number;
	public static maxGroupedMentions?: number;

	public static projects: string[];

	public static request: RequestConfig;

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

		if ( !settings.embed_types ) throw 'Embed Types are not defined!';
		this.embedTypes = new Map<string, EmbedConfig>();
		Object.keys( settings.embed_types ).forEach( ( key: string ) => {
			this.embedTypes.set( key, new EmbedConfig( settings.embed_types[key] ) );
		} );

		if( settings.max_grouped_mentions === undefined ) throw 'Max ungrouped mentions are not defined!';
		this.maxUngroupedMentions = settings.max_ungrouped_mentions as number;

		if( settings.max_grouped_mentions === undefined ) throw 'Max grouped mentions are not defined!';
		this.maxGroupedMentions = settings.max_grouped_mentions as number;

		if( !settings.default_embed ) throw 'Default embed is not defined!';
		this.defaultEmbed = this.embedTypes.get( settings.default_embed );
		if( !this.defaultEmbed ) throw `Default embed is set to an undefined embed type "${ settings.default_embed }"!`;

		if ( !( settings.mention_types instanceof Array ) ) throw 'Mention Types are not defined!';
		this.mentionTypes = new Array<MentionConfig>();

		for ( const mentionType of settings.mention_types ) {
			this.mentionTypes.push( new MentionConfig( mentionType, this.embedTypes ) );
		}

		if ( !settings.projects ) throw 'Projects are not set';
		this.projects = settings.projects;

		this.request = settings.request || {};

		if ( !settings.roles ) throw 'Roles are not set';
		this.roles = settings.roles;

		if ( !settings.filter_feed_interval ) throw 'Filter feed interval is not set';
		this.filterFeedInterval = settings.filter_feed_interval;

		if ( !settings.filter_feeds ) throw 'Filter feeds are not set';
		this.filterFeeds = new Array<FilterFeedConfig>();

		for( const filterFeed of settings.filter_feeds ) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const feed: any = { embed: this.defaultEmbed };

			Object.keys( filterFeed ).forEach( key => {
				const camelCaseKey = key.replace( /_./g, match => match.substring( 1, 2 ).toUpperCase() );
				feed[ camelCaseKey ] = filterFeed[ key ];

			} );

			if ( filterFeed.embed ) {
				feed.embed = this.embedTypes.get( filterFeed.embed );
				if( !feed.embed ) throw `A filter feed uses an undefined embed type "${ filterFeed.embed }"!`;
			}

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
