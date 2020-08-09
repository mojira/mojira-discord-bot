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
	public onEvent = ( messageReaction: MessageReaction, user: User ): void => {
		if ( user.id === this.botUserId ) return;

		if ( messageReaction.message.id === BotConfig.rolesMessage ) {
			// Handle role removal
			this.roleRemoveHandler.onEvent( messageReaction, user );
		} else if ( BotConfig.request.internalChannels.includes( messageReaction.message.channel.id ) ) {
			// Handle unresolving user request
			this.requestUnresolveEventHandler.onEvent( messageReaction, user );
		}
	};
}