import { User, MessageReaction, TextChannel } from 'discord.js';
import BotConfig from '../BotConfig';
import EventHandler from './EventHandler';
import SelectRoleEventHandler from './roles/SelectRoleEventHandler';
import ResolveRequestEventHandler from './requests/ResolveRequestEventHandler';
import NewRequestEventHandler from './requests/NewRequestEventHandler';

export default class AddReactionEventHandler implements EventHandler {
	public readonly eventName = 'messageReactionAdd';

	private readonly botUserId: string;

	private readonly selectRoleHandler = new SelectRoleEventHandler();
	private readonly resolveRequestHandler = new ResolveRequestEventHandler();
	private readonly newRequestEventHandler: NewRequestEventHandler;

	constructor( botUserId: string, internalChannels: Map<string, TextChannel> ) {
		this.botUserId = botUserId;
		this.newRequestEventHandler = new NewRequestEventHandler( internalChannels );
	}

	// This syntax is used to ensure that `this` refers to the `AddReactionEventHandler` object
	public onEvent = ( messageReaction: MessageReaction, user: User ): void => {
		// Do not react to own reactions
		if ( user.id === this.botUserId ) return;

		if ( messageReaction.message.id === BotConfig.rolesMessage ) {
			// Handle role selection
			this.selectRoleHandler.onEvent( messageReaction, user );
		} else if ( BotConfig.request.internalChannels.includes( messageReaction.message.channel.id ) ) {
			// Handle resolving user request
			this.resolveRequestHandler.onEvent( messageReaction, user );
		} else if ( BotConfig.request.logChannel.includes( messageReaction.message.channel.id ) ) {
			// Handle reopening a user request
			this.newRequestEventHandler.onReopen( messageReaction, user );
		}
	};
}