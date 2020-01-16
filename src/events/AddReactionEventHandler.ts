import { User, MessageReaction } from 'discord.js';
import BotConfig from '../BotConfig';
import EventHandler from './EventHandler';
import SelectRoleEventHandler from './SelectRoleEventHandler';
import ResolveRequstEventHandler from './ResolveRequestEventHandler';

export default class AddReactionEventHandler implements EventHandler {
	public readonly eventName = 'messageReactionAdd';

	private readonly botUserId: string;

	private readonly selectRoleHandler = new SelectRoleEventHandler();
	private readonly resolveRequestHandler = new ResolveRequstEventHandler();

	constructor( botUserId: string ) {
		this.botUserId = botUserId;
	}

	// This syntax is used to ensure that `this` refers to the `AddReactionEventHandler` object
	public onEvent = ( messageReaction: MessageReaction, user: User ): void => {
		if ( messageReaction.message.id === BotConfig.rolesMessage && user.id !== this.botUserId ) {
			// Handle with selecting role
			return this.selectRoleHandler.onEvent( messageReaction, user );
		} else if ( BotConfig.requestChannels.includes( messageReaction.message.channel.id ) ) {
			// Handle with resolving user request. Please make sure that only helpers and moderators
			// can add reactions to messages in request channels
			return this.resolveRequestHandler.onEvent( messageReaction, user );
		}
	};
}