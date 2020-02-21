import { Guild } from 'discord.js';
import { isArray } from 'util';
import BotConfig from './BotConfig';

interface RawGuildConfig {
	id: number;
	guild_id: string;
	escape_prefix: string;
	mention_prefix: string;
	ignore_urls: number;
	home_channel: string;
}

export default class GuildConfig {
	private readonly id: number;
	public readonly guildId: string;
	private _escapePrefixes: string;
	private _mentionPrefix: string;
	private _ignoreUrls: boolean;
	private _homeChannelId: string;

	constructor( rawConfig: RawGuildConfig ) {
		this.id = rawConfig.id;
		this.guildId = rawConfig.guild_id;
		this._escapePrefixes = rawConfig.escape_prefix;
		this._mentionPrefix = rawConfig.mention_prefix;
		this._ignoreUrls = rawConfig.ignore_urls === 1;
		this._homeChannelId = rawConfig.home_channel;
	}

	get escapePrefixes(): string {
		return this._escapePrefixes;
	}

	set escapePrefixes( prefixes: string ) {
		this._escapePrefixes = prefixes;
		BotConfig.database.prepare(
			`UPDATE guild_configs
			SET escape_prefix = ?
			WHERE id = ?`
		).run(
			prefixes,
			this.id
		);
	}

	get mentionPrefix(): string {
		return this._mentionPrefix;
	}

	set mentionPrefix( prefix: string ) {
		this._mentionPrefix = prefix;
		BotConfig.database.prepare(
			`UPDATE guild_configs
			SET mention_prefix = ?
			WHERE id = ?`
		).run(
			prefix,
			this.id
		);
	}

	get ignoreUrls(): boolean {
		return this._ignoreUrls;
	}

	set ignoreUrls( ignore: boolean ) {
		this._ignoreUrls = !!ignore;
		const result = BotConfig.database.prepare(
			`UPDATE guild_configs
			SET ignore_urls = ?
			WHERE id = ?`
		).run(
			this._ignoreUrls ? 1 : 0,
			this.id
		);
		console.log( result );
	}

	get homeChannelId(): string {
		return this._homeChannelId;
	}

	set homeChannelId( channelId: string ) {
		this._homeChannelId = channelId;
		BotConfig.database.prepare(
			`UPDATE guild_configs
			SET home_channel = ?
			WHERE id = ?`
		).run(
			channelId,
			this.id
		);
	}

	public static create( guild: Guild ): GuildConfig {
		const newGuildId = BotConfig.database.prepare(
			`INSERT INTO guild_configs (
				guild_id,
				escape_prefix,
				mention_prefix,
				ignore_urls,
				home_channel
			) VALUES (?, ?, ?, ?, ?)`
		).run(
			guild.id,
			BotConfig.forbiddenTicketPrefix,
			BotConfig.requiredTicketPrefix,
			BotConfig.ticketUrlsCauseEmbed ? 0 : 1,
			guild.systemChannelID
		).lastInsertRowid;

		/* eslint-disable @typescript-eslint/camelcase */
		return new GuildConfig( {
			id: +newGuildId,
			guild_id: guild.id,
			// TODO previously forbidden prefix
			escape_prefix: BotConfig.forbiddenTicketPrefix,
			mention_prefix: BotConfig.requiredTicketPrefix,
			// TODO inversion of previous config
			ignore_urls: BotConfig.ticketUrlsCauseEmbed ? 0 : 1,
			home_channel: guild.systemChannelID,
		} );
		/* eslint-enable @typescript-eslint/camelcase */
	}

	public static setup(): void {
		BotConfig.database.prepare(
			`CREATE TABLE IF NOT EXISTS guild_configs (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				guild_id TEXT,
				escape_prefix TEXT,
				mention_prefix TEXT,
				ignore_urls INTEGER,
				home_channel TEXT
			)`
		).run();

		const rows = BotConfig.database.prepare( 'SELECT * FROM guild_configs' ).all();
		if ( isArray( rows ) ) {
			for ( const row of rows ) {
				BotConfig.guildConfigs.set( row.guild_id, new GuildConfig( row ) );
			}
		}
	}

	public toString(): string {
		return `guildId = ${ this.guildId }
			escapePrefixes = ${ this.escapePrefixes }
			mentionPrefix = ${ this.mentionPrefix }
			ignoreUrls = ${ this.ignoreUrls }
			homeChannelId = ${ this.homeChannelId }`;
	}
}