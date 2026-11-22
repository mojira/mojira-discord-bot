import { AnyThreadChannel, Client, Collection, Message, MessageManager, MessageType, Snowflake, TextChannel } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../../BotConfig.js';
import DiscordUtil from '../../util/DiscordUtil.js';
import { ModmailUtil } from '../../util/ModmailUtil.js';
import ModmailEventHandler from './ModmailEventHandler.js';
import ModmailPinEventHandler from './ModmailPinEventHandler.js';
import ModmailThreadEventHandler from './ModmailThreadEventHandler.js';

export default class ModmailCatchUp {
	private logger = log4js.getLogger( 'ModmailCatchUp' );

	private readonly modmailEventHandler = new ModmailEventHandler();
	private readonly modmailThreadEventHandler = new ModmailThreadEventHandler();
	private readonly modmailPinEventHandler = new ModmailPinEventHandler();

	/**
	 * Handles the modmail messages and status changes from while the bot was offline
	 */
	public async run( client: Client ): Promise<void> {
		const modmailChannel = await DiscordUtil.getChannel( BotConfig.modmailChannel );
		if ( !( modmailChannel instanceof TextChannel ) ) return;

		const previouslyOpen = ModmailUtil.getThreads();
		const active = ( await modmailChannel.threads.fetchActive() ).threads;

		for ( const { thread } of previouslyOpen ) {
			if ( !active.has( thread ) ) {
				await ModmailUtil.closeThread( thread );
			}
		}

		for ( const thread of active.values() ) {
			await this.modmailEventHandler.reopen( thread );
		}

		// Conversations that were closed meanwhile can still have missed messages from the user
		const conversations = new Map( [ ...previouslyOpen, ...ModmailUtil.getThreads() ].map( ( { user, thread } ) => [ thread, user ] ) );
		for ( const [ thread, user ] of conversations ) {
			try {
				await this.catchUp( client, user, thread, active.get( thread ) );
			} catch ( e ) {
				this.logger.error( e );
			}
		}
	}

	private async catchUp( client: Client, userId: Snowflake, threadId: Snowflake, thread: AnyThreadChannel | undefined ): Promise<void> {
		const lastThreadMessage = BotConfig.database.prepare(
			`SELECT thread_message AS message FROM modmail_messages
			WHERE thread = ?
			ORDER BY rowid DESC LIMIT 1`
		).get( threadId ) as { message: string } | undefined;

		const lastDmMessage = BotConfig.database.prepare(
			`SELECT dm_message AS message FROM modmail_messages
			WHERE thread = ? AND dm_message IS NOT NULL
			ORDER BY rowid DESC LIMIT 1`
		).get( threadId ) as { message: string } | undefined;

		if ( lastThreadMessage === undefined || lastDmMessage === undefined ) return;

		if ( thread ) {
			await this.handleMissed( thread.messages, thread.lastMessageId, lastThreadMessage.message, this.modmailThreadEventHandler.onEvent );
		}

		const dm = await ( await client.users.fetch( userId ) ).createDM();
		await this.handleMissed( dm.messages, dm.lastMessageId, lastDmMessage.message, this.modmailEventHandler.onEvent );
	}

	private async handleMissed( messages: MessageManager, lastMessageId: Snowflake | null, cursor: Snowflake, handler: ( message: Message ) => Promise<void> ): Promise<void> {
		if ( !lastMessageId || BigInt( lastMessageId ) <= BigInt( cursor ) ) return;

		const missed: Message[] = [];
		let after = cursor;
		let batch: Collection<Snowflake, Message>;
		do {
			batch = ( await messages.fetch( { after, limit: 100 } ) ).sort( ( a, b ) => a.createdTimestamp - b.createdTimestamp );
			missed.push( ...batch.values() );
			after = batch.lastKey() ?? after;
		} while ( batch.size === 100 );

		for ( const message of missed ) {
			if (
				// Don't handle own messages
				message.author.id === message.client.user.id

				// Don't handle webhooks
				|| message.webhookId

				// Don't handle non-default messages
				|| ( message.type !== MessageType.Default && message.type !== MessageType.Reply && message.type !== MessageType.ChannelPinnedMessage )

				// Don't retry messages that failed before
				|| message.reactions.cache.get( '❌' )?.me
			) continue;

			try {
				await ( message.type === MessageType.ChannelPinnedMessage ? this.modmailPinEventHandler.onPin( message ) : handler( message ) );
			} catch ( e ) {
				this.logger.error( e );
			}
		}
	}
}
