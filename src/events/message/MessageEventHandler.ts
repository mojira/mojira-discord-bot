import { Message } from 'discord.js';
import BotConfig from '../../BotConfig';
import CommandExecutor from '../../commands/CommandExecutor';
import EventHandler from '../EventHandler';
import RequestEventHandler from '../request/RequestEventHandler';

export default class MessageEventHandler implements EventHandler<'message'> {
	public readonly eventName = 'message';

	private readonly botUserId: string;

	private readonly requestEventHandler: RequestEventHandler;

	constructor( botUserId: string, internalChannels: Map<string, string> ) {
		this.botUserId = botUserId;

		this.requestEventHandler = new RequestEventHandler( internalChannels );
	}

	// This syntax is used to ensure that `this` refers to the `MessageEventHandler` object
	public onEvent = async ( message: Message ): Promise<void> => {
		if ( message.partial ) {
			message = await message.fetch();
		}

		if (
			// Don't reply to webhooks
			message.webhookID

			// Don't reply to own messages
			|| message.author.id === this.botUserId

			// Don't reply to non-default messages
			|| message.type !== 'DEFAULT'
		) return;

		if ( BotConfig.request.channels && BotConfig.request.channels.includes( message.channel.id ) ) {
			// This message is in a request channel
			await this.requestEventHandler.onEvent( message );

			// Don't reply in request channels
			return;
		}

		await CommandExecutor.checkCommands( message );
	};
}