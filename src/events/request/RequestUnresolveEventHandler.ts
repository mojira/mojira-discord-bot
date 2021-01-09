import { MessageReaction, User } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig, { PrependResponseMessageType } from '../../BotConfig';
import TaskScheduler from '../../tasks/TaskScheduler';
import { RequestsUtil } from '../../util/RequestsUtil';
import EventHandler from '../EventHandler';

export default class RequestUnresolveEventHandler implements EventHandler<'messageReactionRemove'> {
	public readonly eventName = 'messageReactionRemove';

	private logger = log4js.getLogger( 'RequestUnresolveEventHandler' );

	// This syntax is used to ensure that `this` refers to the `RequestUnresolveEventHandler` object
	public onEvent = async ( { emoji, message }: MessageReaction, user: User ): Promise<void> => {
		this.logger.info( `User ${ user.tag } removed '${ emoji.name }' reaction from request message '${ message.id }'` );

		if ( message.partial ) {
			message = await message.fetch();
		}

		await message.edit( message.embeds[0].setColor( RequestsUtil.getEmbedColor() ) );

		if ( BotConfig.request.prependResponseMessage == PrependResponseMessageType.WhenResolved ) {
			try {
				await message.edit( '' );
			} catch ( error ) {
				this.logger.error( error );
			}
		}

		if ( message.reactions.cache.size <= BotConfig.request.suggestedEmoji.length ) {
			this.logger.info( `Cleared message task for request message '${ message.id }'` );
			TaskScheduler.clearMessageTasks( message );
		}
	};
}