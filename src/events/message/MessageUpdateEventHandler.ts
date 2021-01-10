import EventHandler from '../EventHandler';
import { Message } from 'discord.js';
import BotConfig from '../../BotConfig';
import RequestDeleteEventHandler from '../request/RequestDeleteEventHandler';
import RequestEventHandler from '../request/RequestEventHandler';
import DiscordUtil from '../../util/DiscordUtil';

export default class MessageUpdateEventHandler implements EventHandler<'messageUpdate'> {
	public readonly eventName = 'messageUpdate';

	private readonly botUserId: string;

	private readonly requestEventHandler: RequestEventHandler;
	private readonly requestDeleteEventHandler: RequestDeleteEventHandler;

	constructor( botUserId: string, internalChannels: Map<string, string> ) {
		this.botUserId = botUserId;

		this.requestEventHandler = new RequestEventHandler( internalChannels );
		this.requestDeleteEventHandler = new RequestDeleteEventHandler( internalChannels );
	}

	// This syntax is used to ensure that `this` refers to the `MessageUpdateEventHandler` object
	public onEvent = async ( oldMessage: Message, newMessage: Message ): Promise<void> => {
		oldMessage = await DiscordUtil.fetchMessage( oldMessage );
		newMessage = await DiscordUtil.fetchMessage( newMessage );

		if (
			// Don't handle non-default messages
			oldMessage.type !== 'DEFAULT'

			// Don't handle webhooks
			|| oldMessage.webhookID

			// Don't handle own messages
			|| oldMessage.author.id === this.botUserId
		) return;

		if ( BotConfig.request.channels && BotConfig.request.channels.includes( oldMessage.channel.id ) ) {
			// The updated message is in a request channel
			await this.requestDeleteEventHandler.onEvent( oldMessage );
			await this.requestEventHandler.onEvent( newMessage );
		}
	};
}