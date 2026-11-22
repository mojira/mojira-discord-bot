import { Message } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../../BotConfig.js';
import { ModmailUtil } from '../../util/ModmailUtil.js';
import EventHandler from '../EventHandler.js';

export default class ModmailThreadEventHandler implements EventHandler<'messageCreate'> {
	public readonly eventName = 'messageCreate';

	private logger = log4js.getLogger( 'ModmailThreadEventHandler' );

	// This syntax is used to ensure that `this` refers to the `ModmailThreadEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		const id = BotConfig.database.prepare( 'SELECT user FROM modmail_threads WHERE thread = ?' ).get( origin.channel.id ) as { user: string } | undefined;

		if ( !origin.channel.isThread() || id === undefined ) return;

		if ( ModmailUtil.isComment( origin ) ) {
			try {
				await ModmailUtil.markComment( origin );
			} catch ( err ) {
				this.logger.error( err );
				await ModmailUtil.markFailed( origin );
			}

			return;
		}

		if ( !ModmailUtil.canForward( origin ) ) {
			await ModmailUtil.markFailed( origin );
			return;
		}

		try {
			const user = await origin.client.users.fetch( id.user );
			const replyTo = await ModmailUtil.findCopy( origin.client, origin.reference?.messageId ?? '' );

			const dm = await user.send( {
				...ModmailUtil.getPayload( origin ),
				reply: replyTo && { messageReference: replyTo.id, failIfNotExists: false },
			} );

			await ModmailUtil.markDelivered( origin, origin.channel.id, dm.id );
		} catch ( err ) {
			this.logger.error( err );
			await ModmailUtil.markFailed( origin );

			return;
		}
		return;
	};
}
