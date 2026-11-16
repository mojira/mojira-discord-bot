import { Message, Routes, Snowflake } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../BotConfig.js';

export class ModmailUtil {
	private static logger = log4js.getLogger( 'ModmailUtil' );

	/**
	 * Stores a delivered message and moves the success reaction from the previous message of the same sender in the same thread to it.
	 * @param origin The message that has been delivered
	 * @param thread The ID of the thread of the conversation
	 * @param copy The ID of the message that `origin` has been delivered as
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

	private static async removeReaction( origin: Message, messageId: Snowflake ): Promise<void> {
		try {
			await origin.client.rest.delete( Routes.channelMessageOwnReaction( origin.channelId, messageId, encodeURIComponent( '📬' ) ) );
		} catch ( err ) {
			this.logger.warn( `Error while removing the reaction from message ${ messageId }`, err );
		}
	}
}
