import { MessageReaction, User } from 'discord.js';
import * as log4js from 'log4js';
import BulkCommand from '../../commands/BulkCommand';
import EventHandler from '../EventHandler';

export default class RequestBulkRemoveEventHandler implements EventHandler<'messageReactionRemove'> {
	public readonly eventName = 'messageReactionRemove';

	private logger = log4js.getLogger( 'RequestBulkRemoveEventHandler' );

	// This syntax is used to ensure that `this` refers to the `RequestResolveEventHandler` object
	public onEvent = async ( reaction: MessageReaction, user: User ): Promise<void> => {
		this.logger.info( `User ${ user.tag } removed '${ reaction.emoji.name }' reaction from request message '${ reaction.message.id }'` );

		if ( BulkCommand.currentBulkReactions.has( user ) ) {
			const currentMessages = BulkCommand.currentBulkReactions.get( user );
			for ( let i = 0; i <= currentMessages.length; i++ ) {
				const currentMessage = currentMessages[i];
				if ( currentMessage === reaction.message ) {
					BulkCommand.currentBulkReactions.delete( user );
					BulkCommand.currentBulkReactions.set( user, currentMessages.splice( i, 1 ) );
					break;
				}
			}
		}
	};
}
