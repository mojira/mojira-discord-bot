import { Message, MessageType, OmitPartialGroupDMChannel, PartialMessage, Snowflake } from 'discord.js';
import BotConfig from '../../BotConfig.js';
import DiscordUtil from '../../util/DiscordUtil.js';
import EventHandler from '../EventHandler.js';
import RequestDeleteEventHandler from '../request/RequestDeleteEventHandler.js';

export default class MessageDeleteEventHandler implements EventHandler<'messageDelete'> {
	public readonly eventName = 'messageDelete';

	private readonly botUserId: string;

	private readonly requestDeleteEventHandler: RequestDeleteEventHandler;

	constructor( botUserId: string, internalChannels: Map<Snowflake, Snowflake> ) {
		this.botUserId = botUserId;

		this.requestDeleteEventHandler = new RequestDeleteEventHandler( internalChannels );
	}

	// This syntax is used to ensure that `this` refers to the `MessageDeleteEventHandler` object
	public onEvent = async ( message: Message | PartialMessage ): Promise<void> => {
		message = await DiscordUtil.fetchMessage( message );

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
