import { AnyThreadChannel, Message, Snowflake } from 'discord.js';
import log4js from 'log4js';
import { ModmailUtil } from '../../util/ModmailUtil.js';
import EventHandler from '../EventHandler.js';
import ModmailEventHandler from './ModmailEventHandler.js';

export default class ModmailThreadEventHandler implements EventHandler<'messageCreate'> {
	public readonly eventName = 'messageCreate';

	private logger = log4js.getLogger( 'ModmailThreadEventHandler' );

	private readonly modmailEventHandler = new ModmailEventHandler();

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

		await this.modmailEventHandler.reopen( origin.channel as AnyThreadChannel );
		if ( ModmailUtil.getStatus( origin.channelId ) !== 'open' ) {
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
