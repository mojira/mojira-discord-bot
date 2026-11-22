import { BaseMessageOptions, Client, ComponentType, DMChannel, Message, MessageFlags, Routes, Snowflake, TextBasedChannel, ThreadChannel } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../BotConfig.js';
import DiscordUtil from './DiscordUtil.js';

export class ModmailUtil {
	public static readonly accentColor = 0x2FCA74;

	private static logger = log4js.getLogger( 'ModmailUtil' );

	private static readonly maxContentLength = 2000;

	private static readonly queues = new Map<Snowflake, Promise<void>>();

	/**
	 * Creates the tables and indexes used by Modmail
	 */
	public static initDatabase(): void {
		BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS modmail_bans (\'user\' varchar)' );
		BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS modmail_threads (\'user\' varchar, \'thread\' varchar)' );
		BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS modmail_messages (\'thread\' varchar, \'sender\' varchar, \'dm_message\' varchar, \'thread_message\' varchar)' );
		const columns = BotConfig.database.pragma( 'table_info(modmail_threads)' ) as { name: string }[];
		if ( !columns.some( column => column.name === 'status' ) ) {
			BotConfig.database.exec( 'ALTER TABLE modmail_threads ADD COLUMN \'status\' varchar DEFAULT \'open\'' );
		}
		// Close duplicates that were created before the unique index existed
		BotConfig.database.exec( 'UPDATE modmail_threads SET status = \'closed\' WHERE status = \'open\' AND rowid NOT IN (SELECT MAX(rowid) FROM modmail_threads WHERE status = \'open\' GROUP BY user)' );
		BotConfig.database.exec( 'DROP INDEX IF EXISTS modmail_threads_user' );
		BotConfig.database.exec( 'CREATE UNIQUE INDEX IF NOT EXISTS modmail_threads_open_user ON modmail_threads (user) WHERE status = \'open\'' );
		BotConfig.database.exec( 'CREATE INDEX IF NOT EXISTS modmail_threads_thread ON modmail_threads (thread)' );
		BotConfig.database.exec( 'CREATE INDEX IF NOT EXISTS modmail_messages_thread_sender ON modmail_messages (thread, sender)' );
		BotConfig.database.exec( 'CREATE INDEX IF NOT EXISTS modmail_messages_dm_message ON modmail_messages (dm_message)' );
		BotConfig.database.exec( 'CREATE INDEX IF NOT EXISTS modmail_messages_thread_message ON modmail_messages (thread_message)' );
	}

	/**
	 * Runs the tasks of a conversation one after another, so its messages stay in order
	 */
	public static async queue( channel: TextBasedChannel, task: ( user: Snowflake ) => Promise<void> ): Promise<void> {
		const user = this.findUser( channel );
		if ( user === undefined ) return;

		const previous = this.queues.get( user ) ?? Promise.resolve();
		const current = previous.catch( () => undefined ).then( () => task( user ) );
		this.queues.set( user, current );

		try {
			await current;
		} finally {
			if ( this.queues.get( user ) === current ) {
				this.queues.delete( user );
			}
		}
	}

	/**
	 * All open conversations with their user and thread
	 */
	public static getThreads(): { user: Snowflake; thread: Snowflake }[] {
		return BotConfig.database.prepare( 'SELECT user, thread FROM modmail_threads WHERE status = \'open\'' ).all() as { user: Snowflake; thread: Snowflake }[];
	}

	/**
	 * Finds the thread of a user's open conversation
	 */
	public static findThread( user: Snowflake ): Snowflake | undefined {
		const stored = BotConfig.database.prepare( 'SELECT thread FROM modmail_threads WHERE user = ? AND status = \'open\'' ).get( user ) as { thread: Snowflake } | undefined;
		return stored?.thread;
	}

	/**
	 * Stores the thread of a new conversation
	 */
	public static addThread( user: Snowflake, thread: Snowflake ): void {
		BotConfig.database.prepare(
			`INSERT INTO modmail_threads (user, thread)
			VALUES (?, ?)`
		).run( [ user, thread ] );
	}

	/**
	 * Closes a conversation, keeping its thread and messages
	 */
	public static async closeThread( thread: Snowflake ): Promise<void> {
		const closed = BotConfig.database.prepare(
			`UPDATE modmail_threads SET status = 'closed'
			WHERE thread = ? AND status = 'open'`
		).run( thread );

		if ( closed.changes > 0 ) {
			await this.updateStartMessage( thread, false );
		}
	}

	/**
	 * Reopens a conversation unless the user has started a newer one, and returns whether it's open
	 */
	public static async reopenThread( thread: Snowflake ): Promise<boolean> {
		const stored = BotConfig.database.prepare(
			`SELECT status, rowid = ( SELECT MAX(rowid) FROM modmail_threads WHERE user = t.user ) AS latest FROM modmail_threads t
			WHERE thread = ?`
		).get( thread ) as { status: string; latest: number } | undefined;

		if ( stored?.status === 'open' ) return true;
		if ( !stored?.latest ) return false;

		BotConfig.database.prepare(
			`UPDATE modmail_threads SET status = 'open'
			WHERE thread = ?`
		).run( thread );

		await this.updateStartMessage( thread, true );
		return true;
	}

	/**
	 * Removes a thread together with its stored messages
	 */
	public static removeThread( thread: Snowflake ): void {
		BotConfig.database.prepare(
			`DELETE FROM modmail_threads
			WHERE thread = ?`
		).run( thread );

		BotConfig.database.prepare(
			`DELETE FROM modmail_messages
			WHERE thread = ?`
		).run( thread );
	}

	/**
	 * Stores a delivered message and moves the success reaction to the end of its block
	 */
	public static async markDelivered( origin: Message, thread: Snowflake, copy: Snowflake ): Promise<void> {
		const sender = origin.channel.isDMBased() ? 'user' : 'staff';
		const [ dmMessage, threadMessage ] = sender === 'user' ? [ origin.id, copy ] : [ copy, origin.id ];

		await this.mark( origin, thread, sender, dmMessage, threadMessage, '📬' );
	}

	/**
	 * Stores a comment and moves the comment reaction to the end of its block
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
			JOIN modmail_threads t ON t.thread = m.thread AND t.status = 'open'
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

	/**
	 * Finds the user whose conversation takes place in a DM or thread
	 */
	private static findUser( channel: TextBasedChannel ): Snowflake | undefined {
		if ( channel instanceof DMChannel ) {
			return channel.recipientId;
		}

		const stored = BotConfig.database.prepare( 'SELECT user FROM modmail_threads WHERE thread = ?' ).get( channel.id ) as { user: string } | undefined;
		return stored?.user;
	}

	/**
	 * Start messages of open conversations have a green accent color, closed ones have none
	 */
	private static async updateStartMessage( thread: Snowflake, open: boolean ): Promise<void> {
		try {
			const channel = await DiscordUtil.getChannel( BotConfig.modmailChannel );
			if ( channel === undefined ) return;

			const message = await channel.messages.fetch( thread );
			const container = message.components[0];
			if ( container?.type !== ComponentType.Container ) return;

			await message.edit( {
				components: [ { ...container.toJSON(), accent_color: open ? this.accentColor : null } ],
				flags: MessageFlags.IsComponentsV2,
			} );
		} catch ( err ) {
			this.logger.error( err );
		}
	}

	private static async mark( origin: Message, thread: Snowflake, sender: string, dmMessage: Snowflake | null, threadMessage: Snowflake, emoji: string ): Promise<void> {
		// Staff messages and comments alternate in blocks, the user's messages form their own
		const previous = BotConfig.database.prepare(
			`SELECT sender, CASE WHEN sender = 'user' THEN dm_message ELSE thread_message END AS message FROM modmail_messages
			WHERE thread = ? AND ( sender = 'user' ) = ?
			ORDER BY rowid DESC LIMIT 1`
		).get( thread, sender === 'user' ? 1 : 0 ) as { sender: string; message: string } | undefined;

		BotConfig.database.prepare(
			`INSERT INTO modmail_messages (thread, sender, dm_message, thread_message)
			VALUES (?, ?, ?, ?)`
		).run( [ thread, sender, dmMessage, threadMessage ] );

		const tasks: Promise<unknown>[] = [ origin.react( emoji ) ];
		if ( previous?.sender === sender ) {
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
