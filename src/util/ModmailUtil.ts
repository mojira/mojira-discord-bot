import { BaseMessageOptions, Client, ComponentType, ContainerBuilder, DiscordAPIError, DMChannel, Message, MessageFlags, PartialMessage, RESTJSONErrorCodes, Routes, SectionBuilder, Snowflake, SnowflakeUtil, TextBasedChannel, TextDisplayBuilder, ThreadChannel } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../BotConfig.js';
import DiscordUtil from './DiscordUtil.js';

type Status = 'open' | 'closed' | 'removed';
type Sender = 'user' | 'staff' | 'comment';

export interface StoredMessage {
	id: number;
	thread: Snowflake;
	sender: Sender;
	dmMessage: Snowflake | null;
	threadMessage: Snowflake;
}

export class ModmailUtil {
	public static readonly accentColor = 0x2FCA74;

	private static logger = log4js.getLogger( 'ModmailUtil' );

	private static readonly maxPreviewLength = 200;

	private static readonly queues = new Map<Snowflake, Promise<void>>();

	/**
	 * Creates the tables and indexes used by Modmail
	 */
	public static initDatabase(): void {
		BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS modmail_bans (\'user\' varchar)' );
		BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS modmail_threads (\'user\' varchar, \'thread\' varchar)' );
		BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS modmail_messages (\'thread\' varchar, \'sender\' varchar, \'dm_message\' varchar, \'thread_message\' varchar)' );
		this.addColumn( 'modmail_bans', 'notified', 'integer DEFAULT 0' );
		this.addColumn( 'modmail_threads', 'status', 'varchar DEFAULT \'open\'' );
		// Remove duplicate bans and close duplicate conversations that were created before the unique indexes existed
		BotConfig.database.exec( 'DELETE FROM modmail_bans WHERE rowid NOT IN (SELECT MIN(rowid) FROM modmail_bans GROUP BY user)' );
		BotConfig.database.exec( 'UPDATE modmail_threads SET status = \'closed\' WHERE status = \'open\' AND rowid NOT IN (SELECT MAX(rowid) FROM modmail_threads WHERE status = \'open\' GROUP BY user)' );
		BotConfig.database.exec( 'CREATE UNIQUE INDEX IF NOT EXISTS modmail_bans_user ON modmail_bans (user)' );
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
	public static async queue( channel: TextBasedChannel | Snowflake, task: ( user: Snowflake ) => Promise<void> ): Promise<void> {
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
	 * Finds the user whose conversation takes place in a DM or thread
	 */
	public static findUser( channel: TextBasedChannel | Snowflake ): Snowflake | undefined {
		if ( channel instanceof DMChannel ) {
			return channel.recipientId;
		}

		const stored = BotConfig.database.prepare( 'SELECT user FROM modmail_threads WHERE thread = ?' ).get( typeof channel === 'string' ? channel : channel.id ) as { user: string } | undefined;
		return stored?.user;
	}

	/**
	 * Bans a user and returns whether they weren't banned yet
	 */
	public static ban( user: Snowflake ): boolean {
		return BotConfig.database.prepare( 'INSERT OR IGNORE INTO modmail_bans (user) VALUES (?)' ).run( user ).changes > 0;
	}

	/**
	 * Unbans a user and returns whether they were banned
	 */
	public static unban( user: Snowflake ): boolean {
		return BotConfig.database.prepare( 'DELETE FROM modmail_bans WHERE user = ?' ).run( user ).changes > 0;
	}

	/**
	 * All banned users, most recently banned first
	 */
	public static getBans(): Snowflake[] {
		return BotConfig.database.prepare( 'SELECT user FROM modmail_bans ORDER BY rowid DESC' ).pluck().all() as Snowflake[];
	}

	public static isBanned( user: Snowflake ): boolean {
		return BotConfig.database.prepare( 'SELECT 1 FROM modmail_bans WHERE user = ?' ).get( user ) !== undefined;
	}

	/**
	 * Marks the ban notice as sent and returns whether it hadn't been sent yet
	 */
	public static markBanNotified( user: Snowflake ): boolean {
		return BotConfig.database.prepare( 'UPDATE modmail_bans SET notified = 1 WHERE user = ? AND notified = 0' ).run( user ).changes > 0;
	}

	/**
	 * When the last message of a conversation was sent
	 */
	public static getLastActivity( thread: Snowflake ): number {
		const stored = BotConfig.database.prepare(
			`SELECT thread_message FROM modmail_messages
			WHERE thread = ?
			ORDER BY rowid DESC LIMIT 1`
		).get( thread ) as { thread_message: Snowflake } | undefined;

		return SnowflakeUtil.timestampFrom( stored?.thread_message ?? thread );
	}

	/**
	 * Whether a message from the user's DMs is part of a conversation
	 */
	public static belongsTo( dmMessage: Snowflake, thread: Snowflake ): boolean {
		return BotConfig.database.prepare( 'SELECT 1 FROM modmail_messages WHERE dm_message = ? AND thread = ?' ).get( dmMessage, thread ) !== undefined;
	}

	/**
	 * All open conversations with their user and thread
	 */
	public static getThreads(): { user: Snowflake; thread: Snowflake }[] {
		return BotConfig.database.prepare( 'SELECT user, thread FROM modmail_threads WHERE status = \'open\'' ).all() as { user: Snowflake; thread: Snowflake }[];
	}

	/**
	 * Finds the user's latest conversation, the only one that can be open or closed
	 */
	public static findLatestThread( user: Snowflake ): { thread: Snowflake; status: Status } | undefined {
		return BotConfig.database.prepare(
			`SELECT thread, status FROM modmail_threads
			WHERE user = ?
			ORDER BY rowid DESC LIMIT 1`
		).get( user ) as { thread: Snowflake; status: Status } | undefined;
	}

	public static getStatus( thread: Snowflake ): Status | undefined {
		return BotConfig.database.prepare( 'SELECT status FROM modmail_threads WHERE thread = ?' ).pluck().get( thread ) as Status | undefined;
	}

	/**
	 * Stores the thread of a new conversation, the user's closed one can't be reopened anymore
	 */
	public static addThread( user: Snowflake, thread: Snowflake ): void {
		BotConfig.database.prepare( 'UPDATE modmail_threads SET status = \'removed\' WHERE user = ? AND status = \'closed\'' ).run( user );
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
			await this.updateAccentColor( thread, false );
		}
	}

	/**
	 * Reopens a closed conversation and returns whether it did
	 */
	public static async reopenThread( thread: Snowflake ): Promise<boolean> {
		const reopened = BotConfig.database.prepare(
			`UPDATE modmail_threads SET status = 'open'
			WHERE thread = ? AND status = 'closed'`
		).run( thread );

		if ( reopened.changes > 0 ) {
			await this.updateAccentColor( thread, true );
		}

		return reopened.changes > 0;
	}

	/**
	 * Removes a conversation if its thread or start message was deleted and returns whether it's removed
	 */
	public static async checkRemoved( client: Client, thread: Snowflake ): Promise<boolean> {
		const status = this.getStatus( thread );
		if ( status === undefined ) return false;
		if ( status === 'removed' ) return true;

		const channel = await client.channels.fetch( thread ).catch( this.ignoreDeleted ) as ThreadChannel | null;
		if ( channel !== null && await channel.fetchStarterMessage().catch( this.ignoreDeleted ) !== null ) return false;

		BotConfig.database.prepare( 'UPDATE modmail_threads SET status = \'removed\' WHERE thread = ?' ).run( thread );

		if ( channel === null ) {
			if ( status === 'open' ) await this.updateAccentColor( thread, false );
		} else if ( !channel.archived ) {
			await channel.setArchived( true );
		}

		return true;
	}

	/**
	 * Forgets a thread together with its stored messages
	 */
	public static forgetThread( thread: Snowflake ): void {
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
	 * Stores a delivered message, moves the success reaction to the end of its block and previews the conversation's first message
	 */
	public static async markDelivered( origin: Message, thread: Snowflake, copy: Snowflake ): Promise<void> {
		const sender = origin.channel.isDMBased() ? 'user' : 'staff';
		const [ dmMessage, threadMessage ] = sender === 'user' ? [ origin.id, copy ] : [ copy, origin.id ];
		const first = BotConfig.database.prepare( 'SELECT 1 FROM modmail_messages WHERE thread = ? AND sender != \'comment\'' ).get( thread ) === undefined;

		await this.mark( origin, thread, sender, dmMessage, threadMessage, '📬' );

		if ( first ) {
			await this.updatePreview( thread, origin.content );
		}
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
			&& message.content.length <= 2000
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
	 * Finds a stored message by the ID of its original
	 */
	public static findOriginal( messageId: Snowflake ): StoredMessage | undefined {
		return BotConfig.database.prepare(
			`SELECT rowid AS id, thread, sender, dm_message AS dmMessage, thread_message AS threadMessage FROM modmail_messages
			WHERE ( sender = 'user' AND dm_message = ? ) OR ( sender != 'user' AND thread_message = ? )`
		).get( messageId, messageId ) as StoredMessage | undefined;
	}

	/**
	 * Forgets a deleted message and updates the reaction of the message before it
	 */
	public static async forget( origin: Message | PartialMessage, stored: StoredMessage ): Promise<void> {
		const neighbour = ( condition: string ) => BotConfig.database.prepare(
			`SELECT sender, CASE WHEN sender = 'user' THEN dm_message ELSE thread_message END AS message FROM modmail_messages
			WHERE thread = ? AND ( sender = 'user' ) = ? AND ${ condition }`
		).get( stored.thread, stored.sender === 'user' ? 1 : 0, stored.id ) as { sender: Sender; message: Snowflake } | undefined;

		const previous = neighbour( 'rowid < ? ORDER BY rowid DESC LIMIT 1' );
		const next = neighbour( 'rowid > ? ORDER BY rowid LIMIT 1' );

		BotConfig.database.prepare( 'DELETE FROM modmail_messages WHERE rowid = ?' ).run( stored.id );

		if ( previous === undefined ) return;

		const emoji = previous.sender === 'comment' ? '💭' : '📬';
		if ( previous.sender === stored.sender && next?.sender !== stored.sender ) {
			await origin.client.rest.put( Routes.channelMessageOwnReaction( origin.channelId, previous.message, encodeURIComponent( emoji ) ) );
		} else if ( previous.sender !== stored.sender && next?.sender === previous.sender ) {
			await this.removeReaction( origin, previous.message, emoji );
		}
	}

	/**
	 * Start messages of open conversations have a green accent color, closed ones have none
	 */
	private static async updateAccentColor( thread: Snowflake, open: boolean ): Promise<void> {
		await this.updateStartMessage( thread, container => open ? container.setAccentColor( this.accentColor ) : container.clearAccentColor() );
	}

	/**
	 * Start messages quote the first delivered message of their conversation
	 */
	private static async updatePreview( thread: Snowflake, content: string ): Promise<void> {
		const preview = content.length > this.maxPreviewLength ? `${ content.slice( 0, this.maxPreviewLength ) }…` : content;
		await this.updateStartMessage( thread, container => ( container.components[0] as SectionBuilder ).spliceTextDisplayComponents(
			1, 1, new TextDisplayBuilder().setContent( preview ? preview.replace( /(^|\n)/g, '$1> ' ) : '> *Attachment*' )
		) );
	}

	private static async updateStartMessage( thread: Snowflake, update: ( container: ContainerBuilder ) => void ): Promise<void> {
		try {
			const channel = await DiscordUtil.getChannel( BotConfig.modmailChannel );
			if ( channel === undefined ) return;

			const message = await channel.messages.fetch( thread );
			const container = message.components[0];
			if ( container?.type !== ComponentType.Container ) return;

			const builder = new ContainerBuilder( container.toJSON() );
			update( builder );

			await message.edit( {
				components: [ builder ],
				flags: MessageFlags.IsComponentsV2,
			} );
		} catch ( err ) {
			this.logger.error( err );
		}
	}

	private static addColumn( table: string, column: string, definition: string ): void {
		const columns = BotConfig.database.pragma( `table_info(${ table })` ) as { name: string }[];
		if ( !columns.some( existing => existing.name === column ) ) {
			BotConfig.database.exec( `ALTER TABLE ${ table } ADD COLUMN '${ column }' ${ definition }` );
		}
	}

	private static async mark( origin: Message, thread: Snowflake, sender: Sender, dmMessage: Snowflake | null, threadMessage: Snowflake, emoji: string ): Promise<void> {
		// Staff messages and comments alternate in blocks, the user's messages form their own
		const previous = BotConfig.database.prepare(
			`SELECT sender, CASE WHEN sender = 'user' THEN dm_message ELSE thread_message END AS message FROM modmail_messages
			WHERE thread = ? AND ( sender = 'user' ) = ?
			ORDER BY rowid DESC LIMIT 1`
		).get( thread, sender === 'user' ? 1 : 0 ) as { sender: Sender; message: Snowflake } | undefined;

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

	private static ignoreDeleted( error: unknown ): null {
		if ( error instanceof DiscordAPIError && ( error.code === RESTJSONErrorCodes.UnknownChannel || error.code === RESTJSONErrorCodes.UnknownMessage ) ) {
			return null;
		}

		throw error;
	}

	private static async removeReaction( origin: Message | PartialMessage, messageId: Snowflake, emoji: string ): Promise<void> {
		try {
			await origin.client.rest.delete( Routes.channelMessageOwnReaction( origin.channelId, messageId, encodeURIComponent( emoji ) ) );
		} catch ( err ) {
			this.logger.warn( `Error while removing the reaction from message ${ messageId }`, err );
		}
	}
}
