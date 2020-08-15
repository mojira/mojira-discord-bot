import { MessageReaction, User } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig, { PrependResponseMessageType } from '../../BotConfig';
import TaskScheduler from '../../tasks/TaskScheduler';
import EventHandler from '../EventHandler';

export default class RequestUnresolveEventHandler implements EventHandler<'messageReactionRemove'> {
	public readonly eventName = 'messageReactionRemove';

	private logger = log4js.getLogger( 'RequestUnresolveEventHandler' );

	// This syntax is used to ensure that `this` refers to the `RequestUnresolveEventHandler` object
	public onEvent = ( { emoji, message }: MessageReaction, user: User ): void => {
		this.logger.info( `User ${ user.tag } removed '${ emoji.name }' reaction from request message '${ message.id }'` );

		if ( BotConfig.request.prependResponseMessage == PrependResponseMessageType.WhenResolved ) {
			message.edit( '' );
		}

		if ( message.reactions.cache.size <= BotConfig.request.suggestedEmoji.length ) {
			this.logger.info( `Cleared message task for request message '${ message.id }'` );
			TaskScheduler.clearMessageTasks( message );
		}
	};
}