import { Message, MessageType, PartialMessage, Snowflake } from 'discord.js';
import BotConfig from '../BotConfig.js';
import EventHandler from './EventHandler.js';
import ModmailDeleteEventHandler from '../../modules/modmail/events/ModmailDeleteEventHandler.js';
import RequestDeleteEventHandler from '../../modules/requests/events/RequestDeleteEventHandler.js';

export default class MessageDeleteEventHandler implements EventHandler<'messageDelete'> {
	public readonly eventName = 'messageDelete';

	private readonly botUserId: string;

	private readonly requestDeleteEventHandler: RequestDeleteEventHandler;
	private readonly modmailDeleteEventHandler: ModmailDeleteEventHandler;

	constructor( botUserId: string, internalChannels: Map<Snowflake, Snowflake> ) {
		this.botUserId = botUserId;

		this.requestDeleteEventHandler = new RequestDeleteEventHandler( internalChannels );
		this.modmailDeleteEventHandler = new ModmailDeleteEventHandler();
	}

	// This syntax is used to ensure that `this` refers to the `MessageDeleteEventHandler` object
	public onEvent = async ( message: Message | PartialMessage ): Promise<void> => {
		if ( BotConfig.modmailEnabled ) {
			// The deleted message might be part of a modmail conversation
			await this.modmailDeleteEventHandler.onEvent( message );
		}

		// Only cached messages can be handled further
		if ( message.partial ) return;

		if (
			// Don't handle non-default messages
			( message.type !== MessageType.Default && message.type !== MessageType.Reply )

			// Don't handle webhooks
			|| message.webhookId

			// Don't handle own messages
			|| message.author.id === this.botUserId
		) return;

		if ( BotConfig.request.channels && BotConfig.request.channels.includes( message.channel.id ) ) {
			// The deleted message is in a request channel
			await this.requestDeleteEventHandler.onEvent( message );
		}
	};
}
