import { Message, Routes, Snowflake } from 'discord.js';
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

		const previous = BotConfig.database.prepare(
			`SELECT dm_message, thread_message FROM modmail_messages
			WHERE thread = ? AND sender = ?
			ORDER BY rowid DESC LIMIT 1`
		).get( thread, sender ) as { dm_message: string; thread_message: string } | undefined;

		BotConfig.database.prepare(
			`INSERT INTO modmail_messages (thread, sender, dm_message, thread_message)
			VALUES (?, ?, ?, ?)`
		).run( [ thread, sender, dmMessage, threadMessage ] );

		const tasks: Promise<unknown>[] = [ origin.react( '📬' ) ];
		if ( previous ) {
			tasks.push( this.removeReaction( origin, sender === 'user' ? previous.dm_message : previous.thread_message ) );
		}
		await Promise.all( tasks );
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

	public static async markFailed( origin: Message ): Promise<void> {
		try {
			await origin.react( '❌' );
		} catch ( err ) {
			this.logger.error( err );
		}
	}

	private static async removeReaction( origin: Message, messageId: Snowflake ): Promise<void> {
		try {
			await origin.client.rest.delete( Routes.channelMessageOwnReaction( origin.channelId, messageId, encodeURIComponent( '📬' ) ) );
		} catch ( err ) {
			this.logger.warn( `Error while removing the reaction from message ${ messageId }`, err );
		}
	}
}
