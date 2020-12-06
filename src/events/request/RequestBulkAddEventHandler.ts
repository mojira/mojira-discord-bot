import { MessageReaction, User } from 'discord.js';
import * as log4js from 'log4js';
import EventHandler from '../EventHandler';
import BulkCommand from '../../commands/BulkCommand';

export default class RequestBulkAddEventHandler implements EventHandler<'messageReactionAdd'> {
	public readonly eventName = 'messageReactionAdd';

	private logger = log4js.getLogger( 'RequestBulkAddEventHandler' );

	// This syntax is used to ensure that `this` refers to the `RequestResolveEventHandler` object
	public onEvent = async ( reaction: MessageReaction, user: User ): Promise<void> => {
		this.logger.info( `User ${ user.tag } added '${ reaction.emoji.name }' reaction to request message '${ reaction.message.id }'` );

		if ( BulkCommand.currentBulkReactions.has( user ) ) {
			BulkCommand.currentBulkReactions.get( user ).push( reaction.message );
		} else {
			BulkCommand.currentBulkReactions.set( user, [reaction.message] );
		}
	};
}
