import { User, MessageReaction } from 'discord.js';
import * as log4js from 'log4js';
import EventHandler from '../EventHandler';
import TaskScheduler from '../../tasks/TaskScheduler';
import BotConfig, { PrependResponseMessageType } from '../../BotConfig';
import ResolveRequestMessageTask from '../../tasks/ResolveRequestMessageTask';
import { RequestsUtil } from '../../util/RequestsUtil';

export default class ResolveRequestEventHandler implements EventHandler {
	public readonly eventName = '';

	private readonly instance: this;

	constructor() {
		if ( this.instance ) {
			return this.instance;
		}
		this.instance = this;
	}

	private logger = log4js.getLogger( 'ResolveRequestEventHandler' );

	// This syntax is used to ensure that `this` refers to the `ResolveRequestEventHandler` object
	public onEvent = async ( reaction: MessageReaction, user: User ): Promise<void> => {
		this.logger.info( `User ${ user.tag } added '${ reaction.emoji.name }' reaction to request message '${ reaction.message.id }'` );

		TaskScheduler.clearMessageTasks( reaction.message );

		if ( BotConfig.request.prepend_response_message == PrependResponseMessageType.WhenResolved
			&& BotConfig.request.ignore_prepend_response_message_emoji !== reaction.emoji.name ) {
			const origin = await RequestsUtil.getOriginMessage( reaction.message );
			if ( origin ) {
				reaction.message.edit( RequestsUtil.getResponseMessage( origin ) );
			}
		}

		TaskScheduler.addOneTimeMessageTask(
			reaction.message,
			new ResolveRequestMessageTask( reaction.emoji, user ),
			BotConfig.request.resolve_delay || 0
		);
	};
}
