import {User, MessageReaction, Message, TextChannel} from 'discord.js';
import * as log4js from 'log4js';
import EventHandler from '../EventHandler';
import TaskScheduler from '../../tasks/TaskScheduler';
import BotConfig, { PrependResonseMessage } from '../../BotConfig';
import ResolveRequestMessageTask from '../../tasks/ResolveRequestMessageTask';
import { RequestsUtil } from '../../util/RequestsUtil';
import NewRequestEventHandler from './NewRequestEventHandler';

export default class ResolveRequestEventHandler implements EventHandler {
	public readonly eventName = '';

	private logger = log4js.getLogger('ResolveRequestEventHandler');

	// This syntax is used to ensure that `this` refers to the `ResolveRequestEventHandler` object
	public onEvent = async (reaction: MessageReaction, user: User): Promise<void> => {
		this.logger.info(`User ${user.tag} added '${reaction.emoji.name}' reaction to request message '${reaction.message.id}'` );

		TaskScheduler.clearMessageTasks(reaction.message);

		if (BotConfig.request.prepend_response_message == PrependResonseMessage.WhenResolved) {
			const origin = await RequestsUtil.getOriginMessage(reaction.message);
			reaction.message.edit(RequestsUtil.getResponseMessage(origin));
		}

		TaskScheduler.addOneTimeMessageTask(
			reaction.message,
			new ResolveRequestMessageTask(reaction.emoji, user),
			BotConfig.request.resolve_delay || 0
		);
	};

	// This syntax is used to ensure that `this` refers to the `ResolveRequestEventHandler` object
	public onReopen = async ( reaction: MessageReaction, user: User, newRequestHandler: NewRequestEventHandler ): Promise<void> => {
		this.logger.info( `User ${user.tag} is reopening the request message '${reaction.message.id}'` );

		const logMessage = reaction.message;
		const embeds = logMessage.embeds;
		if( embeds.length == 0 ) {
			const warning = await logMessage.channel.send( `${ logMessage.author }, this is not a valid log message.` ) as Message;
			warning.delete( BotConfig.request.no_link_warning_lifetime || 0 );
		}

		// Assume first embed is the log message
		const logEmbed = embeds[0];
		const url: string = logEmbed.fields[ResolveRequestMessageTask.MESSAGE_FIELD].value;
		const messageUrl = url.match( /\((.*)\)/ )[1];
		const parts = messageUrl.split( '/' );

		const originalChannel = logMessage.client.channels.get( parts[parts.length - 2] );
		if( originalChannel instanceof TextChannel ) {
			originalChannel.fetchMessages( { around: parts[parts.length - 1], limit: 1 } )
				.then( async messages => {
					const requestMessage = messages.first();

					await requestMessage.clearReactions();
					await newRequestHandler.handleNewRequest( requestMessage );
				} );
		}
	};
}