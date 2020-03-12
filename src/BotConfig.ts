import { Client } from 'discord.js';
import MojiraBot from './MojiraBot';

export interface RoleConfig {
	emoji: string;
	desc: string;
	id: string;
}

export interface FilterFeedConfig {
	jql: string;
	channel: string;
	title: string;
	title_single?: string;
}

export enum PrependResonseMessage {
	Never = 'never',
	WhenResolved = 'when_resolved',
	Always = 'always'
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
	prepend_response_message?: PrependResonseMessage;
	prepend_response_message_in_log?: boolean;
	respone_message?: string;
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

	// settings for mention command
	public static ticketUrlsCauseEmbed: boolean;
	public static requiredTicketPrefix: string;
	public static forbiddenTicketPrefix: string;

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

		this.ticketUrlsCauseEmbed = !!settings.ticketUrlsCauseEmbed;

		if ( !settings.forbiddenTicketPrefix ) this.forbiddenTicketPrefix = '';
		else this.forbiddenTicketPrefix = settings.forbiddenTicketPrefix;

		if ( !settings.requiredTicketPrefix ) this.requiredTicketPrefix = '';
		else this.requiredTicketPrefix = settings.requiredTicketPrefix;

		if ( !settings.projects ) throw 'Projects are not set';
		this.projects = settings.projects;

		this.request = settings.request || {};

		if ( !settings.roles ) throw 'Roles are not set';
		this.roles = settings.roles;

		if ( !settings.filter_feed_interval ) throw 'Filter feed interval is not set';
		this.filterFeedInterval = settings.filter_feed_interval;

		if ( !settings.filter_feeds ) throw 'Filter feeds are not set';
		this.filterFeeds = settings.filter_feeds;
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
