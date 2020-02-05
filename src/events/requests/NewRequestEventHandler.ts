import { Message } from 'discord.js';
import * as log4js from 'log4js';
import EventHandler from '../EventHandler';

export default class NewRequestEventHandler implements EventHandler {
	public readonly eventName = '';

	private logger = log4js.getLogger( 'NewRequestEventHandler' );

	// This syntax is used to ensure that `this` refers to the `NewRequestEventHandler` object
	public onEvent = ( message: Message ): void => {
		this.logger.info( `User ${ message.author.tag } posted a new request to requests channel ${ message.channel.id }` );

		if ( message.type === 'PINS_ADD' ) {
			if ( message.deletable ) {
				message.delete();
			}
		} else if ( message.pinnable ) {
			message.pin();
		}
	};
}