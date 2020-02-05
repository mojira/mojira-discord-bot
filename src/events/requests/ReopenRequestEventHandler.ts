import { User, MessageReaction } from 'discord.js';
import * as log4js from 'log4js';
import EventHandler from '../EventHandler';

export default class ReopenRequestEventHandler implements EventHandler {
	public readonly eventName = '';

	private logger = log4js.getLogger( 'ReopenRequestEventHandler' );

	// This syntax is used to ensure that `this` refers to the `ReopenRequestEventHandler` object
	public onEvent = ( { emoji, message }: MessageReaction, user: User ): void => {
		this.logger.info( `User ${ user.tag } removed '${ emoji.name }' reaction from request message '${ message.id }'` );

		if ( message.reactions.size === 0 ) {
			if ( !message.pinned ) {
				message.pin();
			}
		}
	};
}