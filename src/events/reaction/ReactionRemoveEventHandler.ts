import { MessageReaction, User } from 'discord.js';
import BotConfig from '../../BotConfig';
import EventHandler from '../EventHandler';
import RequestBulkRemoveEventHandler from '../request/RequestBulkRemoveEventHandler';
import RequestUnresolveEventHandler from '../request/RequestUnresolveEventHandler';
import RoleRemoveEventHandler from '../roles/RoleRemoveEventHandler';
import MojiraBot from '../../MojiraBot';

export default class ReactionRemoveEventHandler implements EventHandler<'messageReactionRemove'> {
	public readonly eventName = 'messageReactionRemove';

	private readonly botUserId: string;

	private readonly roleRemoveHandler = new RoleRemoveEventHandler();
	private readonly requestUnresolveEventHandler = new RequestUnresolveEventHandler();
	private readonly requestBulkRemoveEventHandler = new RequestBulkRemoveEventHandler();

	constructor( botUserId: string ) {
		this.botUserId = botUserId;
	}

	// This syntax is used to ensure that `this` refers to the `ReactionRemoveEventHandler` object
	public onEvent = async ( messageReaction: MessageReaction, user: User ): Promise<void> => {
		if ( user.id === this.botUserId ) return;

		if ( messageReaction.partial ) {
			messageReaction = await messageReaction.fetch();
		}

		MojiraBot.logger.debug( `User ${ user.tag } removed reaction ${ messageReaction.emoji } to message ${ messageReaction.message.id }` );

		if ( BotConfig.roleGroups.find( g => g.message === messageReaction.message.id ) ) {
			// Handle role removal
			return this.roleRemoveHandler.onEvent( messageReaction, user );
		} else if ( BotConfig.request.internalChannels.includes( messageReaction.message.channel.id ) && messageReaction.emoji.name === BotConfig.request.bulkEmoji ) {
			// Handle removing a request from a bulk action
			return this.requestBulkRemoveEventHandler.onEvent( messageReaction, user );
		} else if ( BotConfig.request.internalChannels.includes( messageReaction.message.channel.id ) ) {
			// Handle unresolving user request
			return this.requestUnresolveEventHandler.onEvent( messageReaction, user );
		}
	};
}