import { AnyThreadChannel } from 'discord.js';
import log4js from 'log4js';
import { ModmailUtil } from '../../util/ModmailUtil.js';
import EventHandler from '../EventHandler.js';

export default class ModmailThreadDeleteEventHandler implements EventHandler<'threadDelete'> {
	public readonly eventName = 'threadDelete';

	private logger = log4js.getLogger( 'ModmailThreadDeleteEventHandler' );

	// This syntax is used to ensure that `this` refers to the `ModmailThreadDeleteEventHandler` object
	public onEvent = async ( thread: AnyThreadChannel ): Promise<void> => {
		try {
			await ModmailUtil.queue( thread, () => ModmailUtil.closeThread( thread.id ) );
		} catch ( e ) {
			this.logger.error( e );
		}
	};
}
