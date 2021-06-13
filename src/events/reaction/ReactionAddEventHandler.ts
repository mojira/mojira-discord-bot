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
import DiscordUtil from '../../util/DiscordUtil';

export default class ReactionAddEventHandler implements DiscordEventHandler<'messageReactionAdd'> {
	public readonly eventName = 'messageReactionAdd';

	private readonly botUserId: string;

	private readonly roleSelectHandler = new RoleSelectEventHandler();
	private readonly requestResolveEventHandler: RequestResolveEventHandler;
	private readonly requestReactionRemovalEventHandler = new RequestReactionRemovalEventHandler();
	private readonly requestReopenEventHandler: RequestReopenEventHandler;
	private readonly mentionDeleteEventHandler = new MentionDeleteEventHandler();

	constructor( botUserId: string, internalChannels: Map<string, string>, requestLimits: Map<string, number> ) {
		this.botUserId = botUserId;

		const requestEventHandler = new RequestEventHandler( internalChannels, requestLimits );
		this.requestResolveEventHandler = new RequestResolveEventHandler( botUserId );
		this.requestReopenEventHandler = new RequestReopenEventHandler( botUserId, requestEventHandler );
	}

	// This syntax is used to ensure that `this` refers to the `ReactionAddEventHandler` object
	public onEvent = async ( reaction: MessageReaction, user: User ): Promise<void> => {
		// Do not react to own reactions
		if ( user.id === this.botUserId ) return;

		reaction = await DiscordUtil.fetchReaction( reaction );
		user = await DiscordUtil.fetchUser( user );

		const message = await DiscordUtil.fetchMessage( reaction.message );

		MojiraBot.logger.debug( `User ${ user.tag } reacted with ${ reaction.emoji } to message ${ message.id }` );

		if ( BotConfig.roleGroups.find( g => g.message === message.id ) ) {
			// Handle role selection
			return this.roleSelectHandler.onEvent( reaction, user );
		} else if ( BotConfig.request.internalChannels.includes( message.channel.id ) ) {
			// Handle resolving user request
			return this.requestResolveEventHandler.onEvent( reaction, user );
		} else if ( BotConfig.request.channels.includes( message.channel.id ) ) {
			// Handle removing user reactions in the request channels
			return this.requestReactionRemovalEventHandler.onEvent( reaction, user );
		} else if ( BotConfig.request.logChannel.includes( message.channel.id ) ) {
			// Handle reopening a user request
			return this.requestReopenEventHandler.onEvent( reaction, user );
		} else if ( reaction.message.author.id === this.botUserId && reaction.emoji.name === BotConfig.embedDeletionEmoji ) {
			// Handle deleting bot embed
			return this.mentionDeleteEventHandler.onEvent( reaction, user );
		}
	};
}