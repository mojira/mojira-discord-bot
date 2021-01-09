import { MessageReaction, User } from 'discord.js';
import BotConfig from '../../BotConfig';
import EventHandler from '../EventHandler';
import RequestUnresolveEventHandler from '../request/RequestUnresolveEventHandler';
import RoleRemoveEventHandler from '../roles/RoleRemoveEventHandler';
import MojiraBot from '../../MojiraBot';

export default class ReactionRemoveEventHandler implements EventHandler<'messageReactionRemove'> {
	public readonly eventName = 'messageReactionRemove';

	private readonly botUserId: string;

	private readonly roleRemoveHandler = new RoleRemoveEventHandler();
	private readonly requestUnresolveEventHandler = new RequestUnresolveEventHandler();

	constructor( botUserId: string ) {
		this.botUserId = botUserId;
	}

	// This syntax is used to ensure that `this` refers to the `ReactionRemoveEventHandler` object
	public onEvent = async ( messageReaction: MessageReaction, user: User ): Promise<void> => {
		if ( user.id === this.botUserId ) return;

		if ( user.partial ) {
			user = await user.fetch();
		}

		if ( messageReaction.partial ) {
			messageReaction = await messageReaction.fetch();
		}

		let message = messageReaction.message;
		if ( messageReaction.message.partial ) {
			message = await messageReaction.message.fetch();
		}

		MojiraBot.logger.debug( `User ${ user.tag } removed reaction ${ messageReaction.emoji } to message ${ message.id }` );

		if ( BotConfig.roleGroups.find( g => g.message === message.id ) ) {
			// Handle role removal
			return this.roleRemoveHandler.onEvent( messageReaction, user );
		} else if ( BotConfig.request.internalChannels.includes( message.channel.id ) ) {
			// Handle unresolving user request
			return this.requestUnresolveEventHandler.onEvent( messageReaction, user );
		}
	};
}