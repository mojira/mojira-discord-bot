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

		if ( BulkCommand.currentBulkReactions.has( user.tag ) ) {
			const currentMessages = BulkCommand.currentBulkReactions.get( user.tag );
			for ( let i = 0; i <= currentMessages.length; i++ ) {
				const currentMessage = currentMessages[i];
				if ( currentMessage.id === reaction.message.id ) {
					BulkCommand.currentBulkReactions.delete( user.tag );
					BulkCommand.currentBulkReactions.set( user.tag, currentMessages.splice( i, 1 ) );
					break;
				}
			}
		}
	};
}
