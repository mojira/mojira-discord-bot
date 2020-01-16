import { User, MessageReaction } from 'discord.js';
import * as log4js from 'log4js';
import EventHandler from './EventHandler';

export default class ResolveRequestEventHandler implements EventHandler {
	public readonly eventName = '';

	private logger = log4js.getLogger( 'ResolveRequestEventHandler' );

	// This syntax is used to ensure that `this` refers to the `ResolveRequestEventHandler` object
	public onEvent = ( { emoji, message }: MessageReaction, user: User ): void => {
		this.logger.info( `User ${ user.tag } added '${ emoji.name }' reaction to a request message '${ message.id }'` );
		if ( message.pinned ) message.unpin();
	};
}