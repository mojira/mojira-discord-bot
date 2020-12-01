import EventHandler from '../EventHandler';
import { Message } from 'discord.js';
import BotConfig from '../../BotConfig';
import RequestDeleteEventHandler from '../request/RequestDeleteEventHandler';
import RequestEventHandler from '../request/RequestEventHandler';

export default class MessageUpdateEventHandler implements EventHandler<'messageUpdate'> {
	public readonly eventName = 'messageUpdate';

	private readonly botUserId: string;

	private readonly requestEventHandler: RequestEventHandler;
	private readonly requestDeleteEventHandler: RequestDeleteEventHandler;

	constructor( botUserId: string, internalChannels: Map<string, string>, internalChannelNames: Map<string, string> ) {
		this.botUserId = botUserId;

		this.requestEventHandler = new RequestEventHandler( internalChannels, internalChannelNames );
		this.requestDeleteEventHandler = new RequestDeleteEventHandler( internalChannels, internalChannelNames );
	}

	// This syntax is used to ensure that `this` refers to the `MessageUpdateEventHandler` object
	public onEvent = async ( oldMessage: Message, newMessage: Message ): Promise<void> => {
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