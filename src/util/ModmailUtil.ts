import { BaseMessageOptions, Client, DMChannel, Message, MessageFlags, Routes, Snowflake, ThreadChannel } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../BotConfig.js';

export class ModmailUtil {
	private static logger = log4js.getLogger( 'ModmailUtil' );

	private static readonly maxContentLength = 2000;

	/**
	 * Creates the tables and indexes used by Modmail
	 */
	public static initDatabase(): void {
		BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS modmail_bans (\'user\' varchar)' );
		BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS modmail_threads (\'user\' varchar, \'thread\' varchar)' );
		BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS modmail_messages (\'thread\' varchar, \'sender\' varchar, \'dm_message\' varchar, \'thread_message\' varchar)' );
		// Remove duplicates that were created before the unique index existed
		BotConfig.database.exec( 'DELETE FROM modmail_threads WHERE rowid NOT IN (SELECT MAX(rowid) FROM modmail_threads GROUP BY user)' );
		BotConfig.database.exec( 'CREATE UNIQUE INDEX IF NOT EXISTS modmail_threads_user ON modmail_threads (user)' );
		BotConfig.database.exec( 'CREATE INDEX IF NOT EXISTS modmail_threads_thread ON modmail_threads (thread)' );
		BotConfig.database.exec( 'CREATE INDEX IF NOT EXISTS modmail_messages_thread_sender ON modmail_messages (thread, sender)' );
		BotConfig.database.exec( 'CREATE INDEX IF NOT EXISTS modmail_messages_dm_message ON modmail_messages (dm_message)' );
		BotConfig.database.exec( 'CREATE INDEX IF NOT EXISTS modmail_messages_thread_message ON modmail_messages (thread_message)' );
	}

	/**
	 * Stores a delivered message and moves the success reaction to the bottom
	 */
	public static async markDelivered( origin: Message, thread: Snowflake, copy: Snowflake ): Promise<void> {
		const sender = origin.channel.isDMBased() ? 'user' : 'staff';
		const [ dmMessage, threadMessage ] = sender === 'user' ? [ origin.id, copy ] : [ copy, origin.id ];

		await this.mark( origin, thread, sender, dmMessage, threadMessage, '📬' );
	}

	/**
	 * Stores a comment and moves the comment reaction to the bottom
	 */
	public static async markComment( origin: Message ): Promise<void> {
		await this.mark( origin, origin.channel.id, 'comment', null, origin.id, '💭' );
	}

	/**
	 * Messages that aren't supported by Modmail
	 */
	public static canForward( message: Message ): boolean {
		return ( message.content !== '' || message.attachments.size > 0 )
			&& message.content.length <= this.maxContentLength
			&& message.stickers.size === 0
			&& message.messageSnapshots.size === 0;
	}

	/**
	 * Comments (`@silent` or `//` prefix, or replies to comments) are not delivered to the user
	 */
	public static isComment( message: Message ): boolean {
		return message.flags.has( MessageFlags.SuppressNotifications )
			|| message.content.startsWith( '//' )
			|| BotConfig.database.prepare(
				`SELECT 1 FROM modmail_messages
				WHERE thread_message = ? AND sender = 'comment'`
			).get( message.reference?.messageId ?? '' ) !== undefined;
	}

	/**
	 * The content of a message as it is sent to the other side
	 */
	public static getPayload( message: Message ): BaseMessageOptions {
		return {
			content: message.content,
			files: message.attachments.map( file => ( {
				attachment: file.url,
				name: file.name ?? undefined,
			} ) ),
			allowedMentions: { parse: [] },
		};
	}

	/**
	 * Finds the copy of a delivered message on the other side
	 */
	public static async findCopy( client: Client, messageId: Snowflake ): Promise<{ thread: Snowflake; channel: ThreadChannel | DMChannel; id: Snowflake } | undefined> {
		const stored = BotConfig.database.prepare(
			`SELECT t.user, m.thread, m.dm_message, m.thread_message FROM modmail_messages m
			JOIN modmail_threads t ON t.thread = m.thread
			WHERE m.sender != 'comment' AND ( m.dm_message = ? OR m.thread_message = ? )`
		).get( messageId, messageId ) as { user: string; thread: string; dm_message: string; thread_message: string } | undefined;

		if ( stored === undefined ) return undefined;

		return stored.dm_message === messageId
			? { thread: stored.thread, channel: await client.channels.fetch( stored.thread ) as ThreadChannel, id: stored.thread_message }
			: { thread: stored.thread, channel: await ( await client.users.fetch( stored.user ) ).createDM(), id: stored.dm_message };
	}

	public static async markFailed( origin: Message ): Promise<void> {
		try {
			await origin.react( '❌' );
		} catch ( err ) {
			this.logger.error( err );
		}
	}

	private static async mark( origin: Message, thread: Snowflake, sender: string, dmMessage: Snowflake | null, threadMessage: Snowflake, emoji: string ): Promise<void> {
		const previous = BotConfig.database.prepare(
			`SELECT CASE WHEN sender = 'user' THEN dm_message ELSE thread_message END AS message FROM modmail_messages
			WHERE thread = ? AND sender = ?
			ORDER BY rowid DESC LIMIT 1`
		).get( thread, sender ) as { message: string } | undefined;

		BotConfig.database.prepare(
			`INSERT INTO modmail_messages (thread, sender, dm_message, thread_message)
			VALUES (?, ?, ?, ?)`
		).run( [ thread, sender, dmMessage, threadMessage ] );

		const tasks: Promise<unknown>[] = [ origin.react( emoji ) ];
		if ( previous ) {
			tasks.push( this.removeReaction( origin, previous.message, emoji ) );
		}
		await Promise.all( tasks );
	}

	private static async removeReaction( origin: Message, messageId: Snowflake, emoji: string ): Promise<void> {
		try {
			await origin.client.rest.delete( Routes.channelMessageOwnReaction( origin.channelId, messageId, encodeURIComponent( emoji ) ) );
		} catch ( err ) {
			this.logger.warn( `Error while removing the reaction from message ${ messageId }`, err );
		}
	}
}
