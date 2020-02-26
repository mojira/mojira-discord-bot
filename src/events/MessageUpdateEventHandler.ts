import EventHandler from './EventHandler';
import { Message, TextChannel } from 'discord.js';
import BotConfig from '../BotConfig';
import DeleteRequestEventHandler from './requests/DeleteRequestEventHandler';
import NewRequestEventHandler from './requests/NewRequestEventHandler';

export default class MessageUpdateEventHandler implements EventHandler {
	public readonly eventName = 'messageUpdate';

	private readonly botUserId: string;

	private readonly newRequestEventHandler: NewRequestEventHandler;
	private readonly deleteRequestEventHandler: DeleteRequestEventHandler;

	constructor( botUserId: string, internalChannels: Map<string, TextChannel> ) {
		this.botUserId = botUserId;

		this.newRequestEventHandler = new NewRequestEventHandler( internalChannels );
		this.deleteRequestEventHandler = new DeleteRequestEventHandler( internalChannels );
	}

	// This syntax is used to ensure that `this` refers to the `MessageUpdateEventHandler` object
	public onEvent = ( oldMessage: Message, newMessage: Message ): void => {
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
			this.deleteRequestEventHandler.onEvent( oldMessage );
			this.newRequestEventHandler.onEvent( newMessage );
		}
	};
}