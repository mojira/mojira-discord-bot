import EventHandler from './EventHandler';
import { Message } from 'discord.js';
import CommandExecutor from '../commands/CommandExecutor';

export default class MessageEventHandler implements EventHandler {
	public readonly eventName = 'message';

	private readonly botUserId: string;

	constructor( botUserId: string ) {
		this.botUserId = botUserId;
	}

	// This syntax is used to ensure that `this` refers to the `MessageEventHandler` object
	public onEvent = ( message: Message ): void => {
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