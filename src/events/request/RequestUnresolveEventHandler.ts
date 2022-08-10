import { MessageReaction, User } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../../BotConfig.js';
import TaskScheduler from '../../tasks/TaskScheduler.js';
import DiscordUtil from '../../util/DiscordUtil.js';
import { RequestsUtil } from '../../util/RequestsUtil.js';
import EventHandler from '../EventHandler.js';

export default class RequestUnresolveEventHandler implements EventHandler<'messageReactionRemove'> {
	public readonly eventName = 'messageReactionRemove';

	private logger = log4js.getLogger( 'RequestUnresolveEventHandler' );

	private readonly botUserId: string;

	constructor( botUserId: string ) {
		this.botUserId = botUserId;
	}

	// This syntax is used to ensure that `this` refers to the `RequestUnresolveEventHandler` object
	public onEvent = async ( { emoji, message }: MessageReaction, user: User ): Promise<void> => {
		message = await DiscordUtil.fetchMessage( message );

		if ( message.author.id !== this.botUserId ) {
			this.logger.info( `User ${ user.tag } removed '${ emoji.name }' reaction from non-bot message '${ message.id }'. Ignored` );
			return;
		}

		this.logger.info( `User ${ user.tag } removed '${ emoji.name }' reaction from request message '${ message.id }'` );

		await message.edit( {
			content: null,
			embeds: [message.embeds[0].setColor( RequestsUtil.getEmbedColor() )],
		} );

		if ( message.reactions.cache.size <= BotConfig.request.suggestedEmoji.length ) {
			this.logger.info( `Cleared message task for request message '${ message.id }'` );
			TaskScheduler.clearMessageTasks( message );
		}
	};
}
