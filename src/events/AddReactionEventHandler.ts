import { User, MessageReaction } from 'discord.js';
import BotConfig from '../BotConfig';
import EventHandler from './EventHandler';
import SelectRoleEventHandler from './roles/SelectRoleEventHandler';
import ResolveRequstEventHandler from './requests/ResolveRequestEventHandler';

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
		// Do not react to own reactions
		if ( user.id === this.botUserId ) return;

		if ( messageReaction.message.id === BotConfig.rolesMessage ) {
			// Handle role selection
			this.selectRoleHandler.onEvent( messageReaction, user );
		} else if ( BotConfig.requestChannels.includes( messageReaction.message.channel.id ) ) {
			// Handle resolved user request
			this.resolveRequestHandler.onEvent( messageReaction, user );
		}
	};
}