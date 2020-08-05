import EventHandler from './EventHandler';
import { User, MessageReaction } from 'discord.js';
import BotConfig from '../BotConfig';
import RemoveRoleEventHandler from './roles/RemoveRoleEventHandler';
import ReopenRequestEventHandler from './requests/ReopenRequestEventHandler';

export default class RemoveReactionEventHandler implements EventHandler {
	public readonly eventName = 'messageReactionRemove';

	private readonly botUserId: string;

	private readonly removeRoleHandler = new RemoveRoleEventHandler();
	private readonly reopenRequestHandler = new ReopenRequestEventHandler();

	constructor( botUserId: string ) {
		this.botUserId = botUserId;
	}

	// This syntax is used to ensure that `this` refers to the `RemoveReactionEventHandler` object
	public onEvent = ( messageReaction: MessageReaction, user: User ): void => {
		if ( user.id === this.botUserId ) return;

		if ( messageReaction.message.id === BotConfig.rolesMessage ) {
			// Handle role removal
			this.removeRoleHandler.onEvent( messageReaction, user );
		} else if ( BotConfig.request.internalChannels.includes( messageReaction.message.channel.id ) ) {
			// Handle unresolving user request
			this.reopenRequestHandler.onEvent( messageReaction, user );
		}
	};
}