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

		if ( !settings.projects ) throw 'Projects are not set';
		this.projects = settings.projects;

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
		}
		catch ( err ) {
			MojiraBot.logger.error( err );
			return false;
		}
		return true;
	}
}
