import { MessageReaction, User } from 'discord.js';
import BotConfig from '../../BotConfig';
import DiscordEventHandler from '../EventHandler';
import RequestEventHandler from '../request/RequestEventHandler';
import RequestReopenEventHandler from '../request/RequestReopenEventHandler';
import RequestResolveEventHandler from '../request/RequestResolveEventHandler';
import RequestReactionRemovalEventHandler from '../request/RequestReactionRemovalEventHandler';
import RoleSelectEventHandler from '../roles/RoleSelectEventHandler';
import MentionDeleteEventHandler from '../mention/MentionDeleteEventHandler';
import MojiraBot from '../../MojiraBot';

export default class ReactionAddEventHandler implements DiscordEventHandler<'messageReactionAdd'> {
	public readonly eventName = 'messageReactionAdd';

	private readonly botUserId: string;

	private readonly roleSelectHandler = new RoleSelectEventHandler();
	private readonly requestResolveEventHandler = new RequestResolveEventHandler();
	private readonly requestReactionRemovalEventHandler = new RequestReactionRemovalEventHandler();
	private readonly requestReopenEventHandler: RequestReopenEventHandler;
	private readonly mentionDeleteEventHandler = new MentionDeleteEventHandler();

	constructor( botUserId: string, internalChannels: Map<string, string> ) {
		this.botUserId = botUserId;

		const requestEventHandler = new RequestEventHandler( internalChannels );
		this.requestReopenEventHandler = new RequestReopenEventHandler( requestEventHandler );
	}

	// This syntax is used to ensure that `this` refers to the `ReactionAddEventHandler` object
	public onEvent = async ( messageReaction: MessageReaction, user: User ): Promise<void> => {
		// Do not react to own reactions
		if ( user.id === this.botUserId ) return;

		if ( messageReaction.partial ) {
			messageReaction = await messageReaction.fetch();
		}

		MojiraBot.logger.debug( `User ${ user.tag } reacted with ${ messageReaction.emoji } to message ${ messageReaction.message.id }` );

		if ( BotConfig.roleGroups.find( g => g.message === messageReaction.message.id ) ) {
			// Handle role selection
			return this.roleSelectHandler.onEvent( messageReaction, user );
		} else if ( BotConfig.request.internalChannels.includes( messageReaction.message.channel.id ) ) {
			// Handle resolving user request
			return this.requestResolveEventHandler.onEvent( messageReaction, user );
		} else if ( BotConfig.request.channels.includes( messageReaction.message.channel.id ) ) {
			// Handle removing user reactions in the request channels
			return this.requestReactionRemovalEventHandler.onEvent( messageReaction, user );
		} else if ( BotConfig.request.logChannel.includes( messageReaction.message.channel.id ) ) {
			// Handle reopening a user request
			return this.requestReopenEventHandler.onEvent( messageReaction, user );
		} else if ( messageReaction.message.author.id === this.botUserId && messageReaction.emoji.name === BotConfig.embedDeletionEmoji ) {
			// Handle deleting bot embed
			return this.mentionDeleteEventHandler.onEvent( messageReaction, user );
		}
	};
}