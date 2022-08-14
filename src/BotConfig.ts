import { Client, ColorResolvable, Snowflake } from 'discord.js';
import { Version2Client as JiraClient } from 'jira.js';
import config from 'config';
import MojiraBot from './MojiraBot.js';
import { VersionChangeType } from './tasks/VersionFeedTask.js';
import SlashCommandRegister from './commands/commandHandlers/SlashCommandRegister.js';

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
	public channels: Snowflake[];
	public internalChannels: Snowflake[];
	public requestLimits: number[];
	public testingRequestChannels: Snowflake[];
	public logChannel: Snowflake;

	public invalidTicketEmoji: string;
	public noLinkEmoji: string;
	public warningLifetime: number;
	public invalidRequestJql: string;
	public waitingEmoji: string;
	public suggestedEmoji: string[];
	public ignorePrependResponseMessageEmoji: string;
	public ignoreResolutionEmoji: string;
	public resolveDelay: number;
	public progressMessageAddDelay: number;
	public prependResponseMessage: PrependResponseMessageType;
	public prependResponseMessageInLog: boolean;
	public responseMessage: string;

	constructor() {
		this.channels = getOrDefault( 'request.channels', [] );
		this.internalChannels = this.channels.length ? config.get( 'request.internalChannels' ) : getOrDefault( 'request.internalChannels', [] );
		this.requestLimits = this.channels.length ? config.get( 'request.requestLimits' ) : getOrDefault( 'request.requestLimits', [] );
		this.testingRequestChannels = getOrDefault( 'request.testingRequestChannels', [] );
		this.logChannel = config.get( 'request.logChannel' );

		if ( this.channels.length !== this.internalChannels.length ) {
			throw new Error( 'There are not exactly as many Request channels and ' );
		}

		this.invalidTicketEmoji = config.get( 'request.invalidTicketEmoji' );
		this.noLinkEmoji = config.get( 'request.noLinkEmoji' );
		this.warningLifetime = config.get( 'request.warningLifetime' );
		this.invalidRequestJql = config.get( 'request.invalidRequestJql' );
		this.waitingEmoji = config.get( 'request.waitingEmoji' );
		this.suggestedEmoji = getOrDefault( 'request.suggestedEmoji', [] );
		this.ignorePrependResponseMessageEmoji = config.get( 'request.ignorePrependResponseMessageEmoji' );
		this.ignoreResolutionEmoji = config.get( 'request.ignoreResolutionEmoji' );

		this.resolveDelay = config.get( 'request.resolveDelay' );
		this.progressMessageAddDelay = config.get( 'request.progressMessageAddDelay' );
		this.prependResponseMessage = getOrDefault( 'request.prependResponseMessage', PrependResponseMessageType.Never );
		this.prependResponseMessageInLog = getOrDefault( 'request.prependResponseMessageInLog', false );
		this.responseMessage = getOrDefault( 'request.responseMessage', '' );
	}
}

export interface RoleConfig {
	emoji: Snowflake;
	title: string;
	desc?: string;
	id: Snowflake;
}

export interface RoleGroupConfig {
	roles: RoleConfig[];
	prompt: string;
	desc?: string;
	color: ColorResolvable;
	channel: Snowflake;
	message?: Snowflake;
	radio?: boolean;
}

export interface FilterFeedConfig {
	jql: string;
	jqlRemoved?: string;
	channel: Snowflake;
	interval: number;
	filterFeedEmoji: string | Snowflake;
	title: string;
	titleSingle?: string;
	publish?: boolean;
	cached?: boolean;
}

export interface VersionFeedConfig {
	projects: string[];
	channel: Snowflake;
	interval: number;
	versionFeedEmoji: string | Snowflake;
	scope: number;
	actions: VersionChangeType[];
	publish?: boolean;
}

export default class BotConfig {
	public static debug: boolean;
	public static logDirectory: false | string;

	private static token: string;
	private static jiraPat?: string;

	public static owners: Snowflake[];

	public static homeChannel: Snowflake;

	public static ticketUrlsCauseEmbed: boolean;
	public static quotedTicketsCauseEmbed: boolean;
	public static requiredTicketPrefix: string;
	public static forbiddenTicketPrefix: string;

	public static embedDeletionEmoji: string;

	public static maxSearchResults: number;

	public static projects: string[];

	public static request: RequestConfig;

	public static roleGroups: RoleGroupConfig[];

	public static filterFeeds: FilterFeedConfig[];
	public static versionFeeds: VersionFeedConfig[];

	public static init(): void {
		this.debug = getOrDefault( 'debug', false );
		this.logDirectory = getOrDefault( 'logDirectory', false );

		this.token = config.get( 'token' );
		this.jiraPat = getOrDefault( 'jiraPat', undefined );

		this.owners = getOrDefault( 'owners', [] );

		this.homeChannel = config.get( 'homeChannel' );
		this.ticketUrlsCauseEmbed = getOrDefault( 'ticketUrlsCauseEmbed', false );
		this.quotedTicketsCauseEmbed = getOrDefault( 'quotedTicketsCauseEmbed', false );

		this.forbiddenTicketPrefix = getOrDefault( 'forbiddenTicketPrefix', '' );
		this.requiredTicketPrefix = getOrDefault( 'requiredTicketPrefix', '' );

		this.embedDeletionEmoji = getOrDefault( 'embedDeletionEmoji', '' );

		this.maxSearchResults = config.get( 'maxSearchResults' );

		this.projects = config.get( 'projects' );

		this.request = new RequestConfig();

		this.roleGroups = getOrDefault( 'roleGroups', [] );

		this.filterFeeds = config.get( 'filterFeeds' );
		this.versionFeeds = config.get( 'versionFeeds' );
	}

	public static async login( client: Client ): Promise<boolean> {
		try {
			await client.login( this.token );
			await SlashCommandRegister.registerCommands( client, this.token );
		} catch ( err ) {
			MojiraBot.logger.error( err );
			return false;
		}
		return true;
	}

	public static jiraLogin(): void {
		// TODO: integrate newErrorHandling from Jira.js
		MojiraBot.jira = new JiraClient( {
			host: 'https://bugs.mojang.com',
			telemetry: false,
			authentication: this.jiraPat === undefined ? undefined : {
				personalAccessToken: this.jiraPat,
			},
		} );
	}
}
