import { MessageReaction, User } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig, { PrependResponseMessageType } from '../../BotConfig';
import ResolveRequestMessageTask from '../../tasks/ResolveRequestMessageTask';
import TaskScheduler from '../../tasks/TaskScheduler';
import { RequestsUtil } from '../../util/RequestsUtil';
import EventHandler from '../EventHandler';

export default class RequestResolveEventHandler implements EventHandler<'messageReactionAdd'> {
	public readonly eventName = 'messageReactionAdd';

	private logger = log4js.getLogger( 'RequestResolveEventHandler' );

	// This syntax is used to ensure that `this` refers to the `RequestResolveEventHandler` object
	public onEvent = async ( reaction: MessageReaction, user: User ): Promise<void> => {
		this.logger.info( `User ${ user.tag } added '${ reaction.emoji.name }' reaction to request message '${ reaction.message.id }'` );

		TaskScheduler.clearMessageTasks( reaction.message );

		if ( BotConfig.request.prependResponseMessage == PrependResponseMessageType.WhenResolved
			&& BotConfig.request.ignorePrependResponseMessageEmoji !== reaction.emoji.name ) {
			const origin = await RequestsUtil.getOriginMessage( reaction.message );
			if ( origin ) {
				try {
					await reaction.message.edit( RequestsUtil.getResponseMessage( origin ) );
				} catch ( error ) {
					this.logger.error( error );
				}
			}
		}

		TaskScheduler.addOneTimeMessageTask(
			reaction.message,
			new ResolveRequestMessageTask( reaction.emoji, user ),
			BotConfig.request.resolveDelay || 0
		);
	};
}
