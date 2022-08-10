import { MessageReaction, User } from 'discord.js';
import BotConfig from '../../BotConfig.js';
import EventHandler from '../EventHandler.js';
import RequestUnresolveEventHandler from '../request/RequestUnresolveEventHandler.js';
import RoleRemoveEventHandler from '../roles/RoleRemoveEventHandler.js';
import MojiraBot from '../../MojiraBot.js';
import DiscordUtil from '../../util/DiscordUtil.js';

export default class ReactionRemoveEventHandler implements EventHandler<'messageReactionRemove'> {
	public readonly eventName = 'messageReactionRemove';

	private readonly botUserId: string;

	private readonly roleRemoveHandler = new RoleRemoveEventHandler();
	private readonly requestUnresolveEventHandler: RequestUnresolveEventHandler;

	constructor( botUserId: string ) {
		this.botUserId = botUserId;
		this.requestUnresolveEventHandler = new RequestUnresolveEventHandler( this.botUserId );
	}

	// This syntax is used to ensure that `this` refers to the `ReactionRemoveEventHandler` object
	public onEvent = async ( reaction: MessageReaction, user: User ): Promise<void> => {
		if ( user.id === this.botUserId ) return;

		reaction = await DiscordUtil.fetchReaction( reaction );
		user = await DiscordUtil.fetchUser( user );

		const message = await DiscordUtil.fetchMessage( reaction.message );

		MojiraBot.logger.debug( `User ${ user.tag } removed reaction ${ reaction.emoji } to message ${ message.id }` );

		if ( BotConfig.roleGroups.find( g => g.message === message.id ) ) {
			// Handle role removal
			return this.roleRemoveHandler.onEvent( reaction, user );
		} else if ( BotConfig.request.internalChannels.includes( message.channel.id ) ) {
			// Handle unresolving user request
			return this.requestUnresolveEventHandler.onEvent( reaction, user );
		}
	};
}
