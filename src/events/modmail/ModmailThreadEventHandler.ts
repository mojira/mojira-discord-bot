import { Message, Snowflake } from 'discord.js';
import log4js from 'log4js';
import { ModmailUtil } from '../../util/ModmailUtil.js';
import EventHandler from '../EventHandler.js';

export default class ModmailThreadEventHandler implements EventHandler<'messageCreate'> {
	public readonly eventName = 'messageCreate';

	private logger = log4js.getLogger( 'ModmailThreadEventHandler' );

	// This syntax is used to ensure that `this` refers to the `ModmailThreadEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		await ModmailUtil.queue( origin.channel, user => this.handle( origin, user ) );
	};

	private async handle( origin: Message, userId: Snowflake ): Promise<void> {
		if ( ModmailUtil.isComment( origin ) ) {
			await this.comment( origin );
			return;
		}

		if ( !ModmailUtil.canForward( origin ) ) {
			await ModmailUtil.markFailed( origin );
			return;
		}

		// Closed conversations can only be reopened if the user hasn't started a newer one since
		if ( !await ModmailUtil.reopenThread( origin.channelId ) ) {
			await this.comment( origin );
			return;
		}

		try {
			const user = await origin.client.users.fetch( userId );
			const replyTo = await ModmailUtil.findCopy( origin.client, origin.reference?.messageId ?? '' );

			const dm = await user.send( {
				...ModmailUtil.getPayload( origin ),
				reply: replyTo && { messageReference: replyTo.id, failIfNotExists: false },
			} );

			await ModmailUtil.markDelivered( origin, origin.channelId, dm.id );
		} catch ( e ) {
			this.logger.error( e );
			await ModmailUtil.markFailed( origin );
		}
	}

	private async comment( origin: Message ): Promise<void> {
		try {
			await ModmailUtil.markComment( origin );
		} catch ( e ) {
			this.logger.error( e );
			await ModmailUtil.markFailed( origin );
		}
	}
}
