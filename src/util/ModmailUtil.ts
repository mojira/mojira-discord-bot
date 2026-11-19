import { Message, MessageFlags, Routes, Snowflake } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../BotConfig.js';

export class ModmailUtil {
	private static logger = log4js.getLogger( 'ModmailUtil' );

	private static readonly maxContentLength = 2000;

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
