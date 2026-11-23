import { AnyThreadChannel, Message, PartialMessage, Snowflake } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../../BotConfig.js';
import { ModmailUtil, StoredMessage } from '../../util/ModmailUtil.js';

export default class ModmailDeleteEventHandler {
	private logger = log4js.getLogger( 'ModmailDeleteEventHandler' );

	public onEvent = async ( origin: Message | PartialMessage ): Promise<void> => {
		const stored = ModmailUtil.findOriginal( origin.id );

		try {
			if ( stored !== undefined ) {
				const thread = await origin.client.channels.fetch( stored.thread ) as AnyThreadChannel;
				await ModmailUtil.queue( thread, user => this.delete( origin, stored, thread, user ) );
			} else if ( origin.channelId === BotConfig.modmailChannel ) {
				// Start messages share their ID with their thread
				await ModmailUtil.queue( origin.id, async () => {
					await ModmailUtil.checkRemoved( origin.client, origin.id );
				} );
			}
		} catch ( e ) {
			this.logger.error( e );
		}
	};

	/**
	 * Deletes staff messages in the DM and marks deleted user messages in the thread
	 */
	private async delete( origin: Message | PartialMessage, stored: StoredMessage, thread: AnyThreadChannel, user: Snowflake ): Promise<void> {
		try {
			if ( stored.sender === 'staff' && stored.dmMessage ) {
				await ( await ( await origin.client.users.fetch( user ) ).createDM() ).messages.delete( stored.dmMessage );
			} else if ( stored.sender === 'user' && !thread.archived ) {
				await thread.messages.react( stored.threadMessage, '🗑️' );
			}
		} finally {
			await ModmailUtil.forget( origin, stored );
		}
	}
}
