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

	private readonly botUserId: string;

	constructor( botUserId: string ) {
		this.botUserId = botUserId;
	}

	// This syntax is used to ensure that `this` refers to the `RequestResolveEventHandler` object
	public onEvent = async ( reaction: MessageReaction, user: User ): Promise<void> => {
		if ( reaction.message.author.id !== this.botUserId ) {
			this.logger.info( `User ${ user.tag } added '${ reaction.emoji.name }' reaction to non-bot message '${ reaction.message.id }'. Ignored` );
			return;
		}

		this.logger.info( `User ${ user.tag } added '${ reaction.emoji.name }' reaction to request message '${ reaction.message.id }'` );

		const embed = reaction.message.embeds[0].setColor( RequestsUtil.getEmbedColor( user ) );
		await reaction.message.edit( embed );

		if ( BotConfig.request.prependResponseMessage == PrependResponseMessageType.WhenResolved
			&& BotConfig.request.ignorePrependResponseMessageEmoji !== reaction.emoji.name ) {
			const origin = await RequestsUtil.getOriginMessage( reaction.message );
			if ( origin ) {
				try {
					await reaction.message.edit( RequestsUtil.getResponseMessage( origin ), embed );
				} catch ( error ) {
					this.logger.error( error );
				}
			}
		}

		if ( BotConfig.request.ignoreResolutionEmoji !== reaction.emoji.name ) {
			TaskScheduler.clearMessageTasks( reaction.message );
			TaskScheduler.addOneTimeMessageTask(
				reaction.message,
				new ResolveRequestMessageTask( reaction.emoji, user ),
				BotConfig.request.resolveDelay || 0
			);
		}
	};
}
