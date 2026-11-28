import { AnyThreadChannel } from 'discord.js';
import log4js from 'log4js';
import { ModmailUtil } from '../ModmailUtil.js';
import EventHandler from '../../../core/events/EventHandler.js';

export default class ModmailThreadDeleteEventHandler implements EventHandler<'threadDelete'> {
	public readonly eventName = 'threadDelete';

	private logger = log4js.getLogger( 'ModmailThreadDeleteEventHandler' );

	public onEvent = async ( thread: AnyThreadChannel ): Promise<void> => {
		try {
			await ModmailUtil.queue( thread, async () => {
				await ModmailUtil.checkRemoved( thread.client, thread.id );
			} );
		} catch ( e ) {
			this.logger.error( e );
		}
	};
}
