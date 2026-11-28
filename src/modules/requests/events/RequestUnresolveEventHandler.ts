import { EmbedBuilder, MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';
import log4js from 'log4js';
import TaskScheduler from '../../../core/tasks/TaskScheduler.js';
import DiscordUtil from '../../../util/DiscordUtil.js';
import { RequestsUtil } from '../RequestsUtil.js';
import EventHandler from '../../../core/events/EventHandler.js';
import RequestResolveEventHandler from './RequestResolveEventHandler.js';

export default class RequestUnresolveEventHandler implements EventHandler<'messageReactionRemove'> {
	public readonly eventName = 'messageReactionRemove';

	private logger = log4js.getLogger( 'RequestUnresolveEventHandler' );

	private readonly botUserId: string;

	private readonly requestResolveEventHandler: RequestResolveEventHandler;

	constructor( botUserId: string ) {
		this.botUserId = botUserId;
		this.requestResolveEventHandler = new RequestResolveEventHandler( botUserId );
	}

	// This syntax is used to ensure that `this` refers to the `RequestUnresolveEventHandler` object
	public onEvent = async ( { emoji, message }: MessageReaction | PartialMessageReaction, user: User | PartialUser ): Promise<void> => {
		message = await DiscordUtil.fetchMessage( message );

		if ( message.author.id !== this.botUserId ) {
			this.logger.info( `User ${ user.tag } removed '${ emoji.name }' reaction from non-bot message '${ message.id }'. Ignored` );
			return;
		}

		this.logger.info( `User ${ user.tag } removed '${ emoji.name }' reaction from request message '${ message.id }'` );

		const embed = new EmbedBuilder( message.embeds[0].data ).setColor( RequestsUtil.getEmbedColor() );

		await message.edit( {
			content: null,
			embeds: [embed],
		} );

		const resolveReactions = RequestsUtil.getResolveReactions( message );

		if ( resolveReactions.size === 0 ) {
			this.logger.info( `Cleared message task for request message '${ message.id }'` );
			TaskScheduler.clearMessageTasks( message );
		} else if ( resolveReactions.size === 1 ) {
			const reaction = resolveReactions.first();
			const resolver = ( await reaction?.users.fetch() )?.find( reactor => reactor.id !== this.botUserId );
			if ( reaction && resolver ) {
				await this.requestResolveEventHandler.onEvent( reaction, resolver );
			}
		}
	};
}
