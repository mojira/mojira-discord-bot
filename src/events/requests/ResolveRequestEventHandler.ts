import { User, MessageReaction } from 'discord.js';
import * as log4js from 'log4js';
import EventHandler from '../EventHandler';
import TaskScheduler from '../../tasks/TaskScheduler';
import BotConfig from '../../BotConfig';
import ResolveRequestMessageTask from '../../tasks/ResolveRequestMessageTask';

export default class ResolveRequestEventHandler implements EventHandler {
	public readonly eventName = '';

	private logger = log4js.getLogger( 'ResolveRequestEventHandler' );

	// This syntax is used to ensure that `this` refers to the `ResolveRequestEventHandler` object
	public onEvent = ( reaction: MessageReaction, user: User ): void => {
		this.logger.info( `User ${ user.tag } added '${ reaction.emoji.name }' reaction to request message '${ reaction.message.id }'` );

		TaskScheduler.addOneTimeMessageTask(
			reaction.message,
			new ResolveRequestMessageTask( reaction.emoji, user ),
			BotConfig.request.resolve_delay || 0
		);
	};
}