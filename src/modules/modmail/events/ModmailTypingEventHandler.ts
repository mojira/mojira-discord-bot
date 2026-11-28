import { AnyThreadChannel, Typing } from 'discord.js';
import log4js from 'log4js';
import { ModmailUtil } from '../ModmailUtil.js';
import EventHandler from '../../../core/events/EventHandler.js';

export default class ModmailTypingEventHandler implements EventHandler<'typingStart'> {
	public readonly eventName = 'typingStart';

	private logger = log4js.getLogger( 'ModmailTypingEventHandler' );

	public onEvent = async ( typing: Typing ): Promise<void> => {
		// Only the user's typing indicator is shown to staff, not the other way round
		if ( !typing.channel.isDMBased() ) return;

		const user = ModmailUtil.findUser( typing.channel );
		if ( user === undefined ) return;

		const latest = ModmailUtil.findLatestThread( user );
		if ( latest?.status !== 'open' ) return;

		try {
			await ( await typing.client.channels.fetch( latest.thread ) as AnyThreadChannel ).sendTyping();
		} catch ( e ) {
			this.logger.error( e );
		}
	};
}
