import { Client } from 'discord.js';
import config from 'config';
import MojiraBot from './MojiraBot';
import { VersionChangeType } from './tasks/VersionFeedTask';

function getOrDefault<T>( configPath: string, defaultValue: T ): T {
	if ( !config.has( configPath ) ) MojiraBot.logger.debug( `config ${ configPath } not set, assuming default` );
	return config.has( configPath ) ? config.get( configPath ) : defaultValue;
}

export enum PrependResponseMessageType {
	Never = 'never',
	WhenResolved = 'whenResolved',
	Always = 'always'
}

export class RequestConfig {
	public channels: string[];
	public internalChannels: string[];
	public logChannel: string;

	public noLinkEmoji: string;
	public noLinkWarningLifetime: number;
	public waitingEmoji: string;
	public suggestedEmoji: string[];
	public ignorePrependResponseMessageEmoji: string;
	public resolveDelay: number;
	public prependResponseMessage: PrependResponseMessageType;
	public prependResponseMessageInLog: boolean;
	public responseMessage: string;

	constructor() {
		this.channels = getOrDefault( 'request.channels', [] );
		this.internalChannels = this.channels.length ? config.get( 'request.internalChannels' ) : getOrDefault( 'request.internalChannels', [] );
		this.logChannel = config.get( 'request.logChannel' );

		if ( this.channels.length !== this.internalChannels.length ) {
			throw new Error( 'There are not exactly as many Request channels and ' );
		}

		this.noLinkEmoji = config.get( 'request.noLinkEmoji' );
		this.noLinkWarningLifetime = config.get( 'request.noLinkWarningLifetime' );
		this.waitingEmoji = config.get( 'request.waitingEmoji' );
		this.suggestedEmoji = getOrDefault( 'request.suggestedEmoji', [] );
		this.ignorePrependResponseMessageEmoji = config.get( 'request.ignorePrependResponseMessageEmoji' );

		this.resolveDelay = config.get( 'request.resolveDelay' );
		this.prependResponseMessage = getOrDefault( 'request.prependResponseMessage', PrependResponseMessageType.Never );
		this.prependResponseMessageInLog = getOrDefault( 'request.prependResponseMessageInLog', false );
		this.responseMessage = getOrDefault( 'request.responseMessage', '' );
	}
}

export interface RoleConfig {
	emoji: string;
	desc: string;
	id: string;
}

export interface RoleGroupConfig {
	roles: RoleConfig[];
	prompt: string;
	channel: string;
	message?: string;
	radio?: boolean;
}

export interface FilterFeedConfig {
	jql: string;
	channel: string;
	filterFeedEmoji: string;
	title: string;
	titleSingle?: string;
}

export interface VersionFeedConfig {
	project: string;
	channel: string;
	versionFeedEmoji: string;
	scope: number;
	actions: VersionChangeType[];
}

export default class BotConfig {
	public static debug: boolean;
	public static logDirectory: false | string;

	// TODO: make private again when /crosspost api endpoint is implemented into discord.js
	public static token: string;
	public static owner: string;

	public static homeChannel: string;

	public static ticketUrlsCauseEmbed: boolean;
	public static requiredTicketPrefix: string;
	public static forbiddenTicketPrefix: string;

	public static projects: string[];

	public static request: RequestConfig;

	public static roleGroups: RoleGroupConfig[];

	public static filterFeedInterval: number;
	public static filterFeeds: FilterFeedConfig[];

	public static versionFeedInterval: number;
	public static versionFeeds: VersionFeedConfig[];

	public static init(): void {
		this.debug = getOrDefault( 'debug', false );
		this.logDirectory = getOrDefault( 'logDirectory', false );

		this.token = config.get( 'token' );
		this.owner = config.get( 'owner' );

		this.homeChannel = config.get( 'homeChannel' );
		this.ticketUrlsCauseEmbed = getOrDefault( 'ticketUrlsCauseEmbed', false );

		this.forbiddenTicketPrefix = getOrDefault( 'forbiddenTicketPrefix', '' );
		this.requiredTicketPrefix = getOrDefault( 'requiredTicketPrefix', '' );

		this.projects = config.get( 'projects' );

		this.request = new RequestConfig();

		this.roleGroups = getOrDefault( 'roleGroups', [] );

		this.filterFeedInterval = config.get( 'filterFeedInterval' );
		this.filterFeeds = config.get( 'filterFeeds' );

		this.versionFeedInterval = config.get( 'versionFeedInterval' );
		this.versionFeeds = config.get( 'versionFeeds' );
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
