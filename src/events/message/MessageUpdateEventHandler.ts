import EventHandler from '../EventHandler.js';
import { Message, Snowflake } from 'discord.js';
import BotConfig from '../../BotConfig.js';
import RequestUpdateEventHandler from '../request/RequestUpdateEventHandler.js';
import DiscordUtil from '../../util/DiscordUtil.js';

export default class MessageUpdateEventHandler implements EventHandler<'messageUpdate'> {
	public readonly eventName = 'messageUpdate';

	private readonly botUserId: string;

	private readonly requestUpdateEventHandler: RequestUpdateEventHandler;

	constructor( botUserId: string, internalChannels: Map<Snowflake, Snowflake> ) {
		this.botUserId = botUserId;

		this.requestUpdateEventHandler = new RequestUpdateEventHandler( internalChannels );
	}

	// This syntax is used to ensure that `this` refers to the `MessageUpdateEventHandler` object
	public onEvent = async ( oldMessage: Message, newMessage: Message ): Promise<void> => {
		oldMessage = await DiscordUtil.fetchMessage( oldMessage );
		newMessage = await DiscordUtil.fetchMessage( newMessage );

		if (
			// Don't handle non-default messages
			( oldMessage.type !== 'DEFAULT' && oldMessage.type !== 'REPLY' )

			// Don't handle webhooks
			|| oldMessage.webhookId

			// Don't handle own messages
			|| oldMessage.author.id === this.botUserId
		) return;

		if ( BotConfig.request.channels && BotConfig.request.channels.includes( oldMessage.channel.id ) ) {
			// The updated message is in a request channel
			await this.requestUpdateEventHandler.onEvent( oldMessage, newMessage );
		}
	};
}
