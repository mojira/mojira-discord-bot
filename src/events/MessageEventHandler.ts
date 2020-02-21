import EventHandler from './EventHandler';
import { Message, TextChannel } from 'discord.js';
import CommandExecutor from '../commands/CommandExecutor';
import BotConfig from '../BotConfig';
import NewRequestEventHandler from './requests/NewRequestEventHandler';

export default class MessageEventHandler implements EventHandler {
	public readonly eventName = 'message';

	private readonly botUserId: string;

	private readonly newRequestEventHandler: NewRequestEventHandler;

	constructor( botUserId: string, internalChannels: Map<string, TextChannel> ) {
		this.botUserId = botUserId;

		this.newRequestEventHandler = new NewRequestEventHandler( internalChannels );
	}

	// This syntax is used to ensure that `this` refers to the `MessageEventHandler` object
	public onEvent = ( message: Message ): void => {
		if ( BotConfig.request.channels && BotConfig.request.channels.includes( message.channel.id ) ) {
			// This message is in a request channel
			this.newRequestEventHandler.onEvent( message );

			// Don't reply in request channels
			return;
		}

		if (
			// Don't reply to non-default messages
			message.type !== 'DEFAULT'

			// Don't reply to webhooks
			|| message.webhookID

			// Don't reply to own messages
			|| message.author.id === this.botUserId
		) return;

		CommandExecutor.checkCommands( message );
	};
}