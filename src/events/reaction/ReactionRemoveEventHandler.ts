import { MessageReaction, User } from 'discord.js';
import BotConfig from '../../BotConfig';
import EventHandler from '../EventHandler';
import RequestUnresolveEventHandler from '../request/RequestUnresolveEventHandler';
import RoleRemoveEventHandler from '../roles/RoleRemoveEventHandler';

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

		if ( messageReaction.partial ) {
			await messageReaction.fetch();
		}

		if ( BotConfig.roleGroups.find( g => g.messageId === messageReaction.message.id ) ) {
			// Handle role removal
			return this.roleRemoveHandler.onEvent( messageReaction, user );
		} else if ( BotConfig.request.internalChannels.includes( messageReaction.message.channel.id ) ) {
			// Handle unresolving user request
			return this.requestUnresolveEventHandler.onEvent( messageReaction, user );
		}
	};
}