import { User, MessageReaction } from 'discord.js';
import * as log4js from 'log4js';
import EventHandler from '../EventHandler';

export default class ResolveRequestEventHandler implements EventHandler {
	public readonly eventName = '';

	private logger = log4js.getLogger( 'ResolveRequestEventHandler' );

	// This syntax is used to ensure that `this` refers to the `ResolveRequestEventHandler` object
	public onEvent = ( reaction: MessageReaction, user: User ): void => {
		this.logger.info( `User ${ user.tag } added '${ reaction.emoji.name }' reaction to request message '${ reaction.message.id }'` );

		if ( !reaction.message.guild.member( user ).permissionsIn( reaction.message.channel ).has( 'ADD_REACTIONS' ) ) {
			reaction.remove( user );
		} else if ( reaction.message.pinned ) {
			reaction.message.unpin();
		}
	};
}