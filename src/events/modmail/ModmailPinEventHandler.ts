import { Client, DMChannel, Message, MessageType, Snowflake, ThreadChannel } from 'discord.js';
import log4js from 'log4js';
import { ModmailUtil } from '../../util/ModmailUtil.js';

export default class ModmailPinEventHandler {
	private logger = log4js.getLogger( 'ModmailPinEventHandler' );

	// This syntax is used to ensure that `this` refers to the `ModmailPinEventHandler` object
	public onPin = async ( origin: Message ): Promise<void> => {
		try {
			const synced = await this.sync( origin.client, origin.reference?.messageId ?? '', true );
			if ( synced === undefined ) return;

			const notice = ( await synced.channel.messages.fetch( { limit: 10 } ) ).find( message =>
				message.type === MessageType.ChannelPinnedMessage && message.reference?.messageId === synced.copy.id );

			if ( notice ) {
				await ModmailUtil.markDelivered( origin, synced.thread, notice.id );
			}
		} catch ( e ) {
			this.logger.error( e );
			await ModmailUtil.markFailed( origin );
		}
	};

	public onUnpin = async ( origin: Message ): Promise<void> => {
		try {
			await this.sync( origin.client, origin.id, false );
		} catch ( e ) {
			this.logger.error( e );
		}
	};

	private async sync( client: Client, messageId: Snowflake, pinned: boolean ): Promise<{ thread: Snowflake; channel: ThreadChannel | DMChannel; copy: Message } | undefined> {
		const found = await ModmailUtil.findCopy( client, messageId );
		if ( found === undefined ) return undefined;

		const copy = await found.channel.messages.fetch( found.id );
		if ( copy.pinned === pinned ) return undefined;

		await ( pinned ? copy.pin() : copy.unpin() );

		return { thread: found.thread, channel: found.channel, copy };
	}
}
