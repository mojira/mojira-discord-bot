import EventHandler from '../EventHandler.js';
import { Message, MessageType, PartialMessage, Snowflake } from 'discord.js';
import BotConfig from '../../BotConfig.js';
import RequestUpdateEventHandler from '../request/RequestUpdateEventHandler.js';
import DiscordUtil from '../../util/DiscordUtil.js';
import ModmailPinEventHandler from '../modmail/ModmailPinEventHandler.js';
import ModmailUpdateEventHandler from '../modmail/ModmailUpdateEventHandler.js';

export default class MessageUpdateEventHandler implements EventHandler<'messageUpdate'> {
	public readonly eventName = 'messageUpdate';

	private readonly botUserId: string;

	private readonly requestUpdateEventHandler: RequestUpdateEventHandler;
	private readonly modmailUpdateEventHandler: ModmailUpdateEventHandler;
	private readonly modmailPinEventHandler: ModmailPinEventHandler;

	constructor( botUserId: string, internalChannels: Map<Snowflake, Snowflake> ) {
		this.botUserId = botUserId;

		this.requestUpdateEventHandler = new RequestUpdateEventHandler( internalChannels );
		this.modmailUpdateEventHandler = new ModmailUpdateEventHandler();
		this.modmailPinEventHandler = new ModmailPinEventHandler();
	}

	// This syntax is used to ensure that `this` refers to the `MessageUpdateEventHandler` object
	public onEvent = async ( oldMessage: Message | PartialMessage, newMessage: Message ): Promise<void> => {
		if ( BotConfig.modmailEnabled && oldMessage.pinned !== false && newMessage.pinned === false ) {
			// The unpinned message might be part of a modmail conversation
			await this.modmailPinEventHandler.onUnpin( newMessage );
		}

		// Pins and resolved embeds don't change the edit timestamp
		const edited = oldMessage.editedTimestamp !== newMessage.editedTimestamp;

		oldMessage = await DiscordUtil.fetchMessage( oldMessage );
		newMessage = await DiscordUtil.fetchMessage( newMessage );

		if (
			// Don't handle non-default messages
			( oldMessage.type !== MessageType.Default && oldMessage.type !== MessageType.Reply )

			// Don't handle webhooks
			|| oldMessage.webhookId

			// Don't handle own messages
			|| oldMessage.author.id === this.botUserId
		) return;

		if ( BotConfig.request.channels && BotConfig.request.channels.includes( oldMessage.channel.id ) ) {
			// The updated message is in a request channel
			await this.requestUpdateEventHandler.onEvent( oldMessage, newMessage );
		} else if ( BotConfig.modmailEnabled && edited ) {
			// The edited message might be part of a modmail conversation
			await this.modmailUpdateEventHandler.onEvent( newMessage );
		}
	};
}
