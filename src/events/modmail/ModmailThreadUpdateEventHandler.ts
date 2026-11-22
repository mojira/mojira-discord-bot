import { AnyThreadChannel } from 'discord.js';
import log4js from 'log4js';
import { ModmailUtil } from '../../util/ModmailUtil.js';
import EventHandler from '../EventHandler.js';

export default class ModmailThreadUpdateEventHandler implements EventHandler<'threadUpdate'> {
	public readonly eventName = 'threadUpdate';

	private logger = log4js.getLogger( 'ModmailThreadUpdateEventHandler' );

	// This syntax is used to ensure that `this` refers to the `ModmailThreadUpdateEventHandler` object
	public onEvent = async ( oldThread: AnyThreadChannel, newThread: AnyThreadChannel ): Promise<void> => {
		if ( oldThread.archived === newThread.archived ) return;

		try {
			await ModmailUtil.queue( newThread, async () => {
				await ( newThread.archived ? ModmailUtil.closeThread( newThread.id ) : ModmailUtil.reopenThread( newThread.id ) );
			} );
		} catch ( e ) {
			this.logger.error( e );
		}
	};
}
