import { AnyThreadChannel } from 'discord.js';
import log4js from 'log4js';
import { ModmailUtil } from '../../util/ModmailUtil.js';
import EventHandler from '../EventHandler.js';
import ModmailEventHandler from './ModmailEventHandler.js';

export default class ModmailThreadUpdateEventHandler implements EventHandler<'threadUpdate'> {
	public readonly eventName = 'threadUpdate';

	private logger = log4js.getLogger( 'ModmailThreadUpdateEventHandler' );

	private readonly modmailEventHandler = new ModmailEventHandler();

	public onEvent = async ( oldThread: AnyThreadChannel, newThread: AnyThreadChannel ): Promise<void> => {
		if ( oldThread.archived === newThread.archived ) return;

		try {
			await ModmailUtil.queue( newThread, async () => {
				await ( newThread.archived ? ModmailUtil.closeThread( newThread.id ) : this.modmailEventHandler.reopen( newThread ) );
			} );
		} catch ( e ) {
			this.logger.error( e );
		}
	};
}
