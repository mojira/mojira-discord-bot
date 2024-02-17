import { MessageReaction, Snowflake, User } from 'discord.js';
import BotConfig from '../../BotConfig.js';
import DiscordEventHandler from '../EventHandler.js';
import RequestEventHandler from '../request/RequestEventHandler.js';
import RequestReopenEventHandler from '../request/RequestReopenEventHandler.js';
import RequestResolveEventHandler from '../request/RequestResolveEventHandler.js';
import RequestReactionRemovalEventHandler from '../request/RequestReactionRemovalEventHandler.js';
import RoleSelectEventHandler from '../roles/RoleSelectEventHandler.js';
import MentionDeleteEventHandler from '../mention/MentionDeleteEventHandler.js';
import DiscordUtil from '../../util/DiscordUtil.js';

export default class ReactionAddEventHandler implements DiscordEventHandler<'messageReactionAdd'> {
	public readonly eventName = 'messageReactionAdd';

	private readonly botUserId: Snowflake;

	private readonly roleSelectHandler = new RoleSelectEventHandler();
	private readonly requestResolveEventHandler: RequestResolveEventHandler;
	private readonly requestReactionRemovalEventHandler = new RequestReactionRemovalEventHandler();
	private readonly requestReopenEventHandler: RequestReopenEventHandler;
	private readonly mentionDeleteEventHandler: MentionDeleteEventHandler;

	constructor( botUserId: Snowflake, internalChannels: Map<Snowflake, Snowflake>, requestLimits: Map<Snowflake, number> ) {
		this.botUserId = botUserId;

		const requestEventHandler = new RequestEventHandler( internalChannels, requestLimits );
		this.requestResolveEventHandler = new RequestResolveEventHandler( botUserId );
		this.requestReopenEventHandler = new RequestReopenEventHandler( botUserId, requestEventHandler );
		this.mentionDeleteEventHandler = new MentionDeleteEventHandler( botUserId );
	}

	// This syntax is used to ensure that `this` refers to the `ReactionAddEventHandler` object
	public onEvent = async ( reaction: MessageReaction, user: User ): Promise<void> => {
		// Do not react to own reactions
		if ( user.id === this.botUserId ) return;

		reaction = await DiscordUtil.fetchReaction( reaction );
		user = await DiscordUtil.fetchUser( user );

		const message = await DiscordUtil.fetchMessage( reaction.message );

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
		} else if ( reaction.message.author?.id === this.botUserId && reaction.emoji.name === BotConfig.embedDeletionEmoji ) {
			// Handle deleting bot embed
			return this.mentionDeleteEventHandler.onEvent( reaction, user );
		}
	};
}
