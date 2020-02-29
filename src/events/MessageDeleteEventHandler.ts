import EventHandler from './EventHandler';
import { Message, TextChannel } from 'discord.js';
import BotConfig from '../BotConfig';
import DeleteRequestEventHandler from './requests/DeleteRequestEventHandler';

export default class MessageDeleteEventHandler implements EventHandler {
	public readonly eventName = 'messageDelete';

	private readonly botUserId: string;

	private readonly deleteRequestEventHandler: DeleteRequestEventHandler;

	constructor( botUserId: string, internalChannels: Map<string, TextChannel> ) {
		this.botUserId = botUserId;

		this.deleteRequestEventHandler = new DeleteRequestEventHandler( internalChannels );
	}

	// This syntax is used to ensure that `this` refers to the `MessageDeleteEventHandler` object
	public onEvent = ( message: Message ): void => {
		if (
			// Don't handle non-default messages
			message.type !== 'DEFAULT'

			// Don't handle webhooks
			|| message.webhookID

			// Don't handle own messages
			|| message.author.id === this.botUserId
		) return;

		if ( BotConfig.request.channels && BotConfig.request.channels.includes( message.channel.id ) ) {
			// The deleted message is in a request channel
			this.deleteRequestEventHandler.onEvent( message );
		}
	};
}