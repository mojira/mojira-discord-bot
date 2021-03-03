import { Message } from 'discord.js';
import BotConfig from '../../BotConfig';
import CommandExecutor from '../../commands/CommandExecutor';
import DiscordUtil from '../../util/DiscordUtil';
import EventHandler from '../EventHandler';
import RequestEventHandler from '../request/RequestEventHandler';
import TestingRequestEventHandler from '../request/TestingRequestEventHandler';

export default class MessageEventHandler implements EventHandler<'message'> {
	public readonly eventName = 'message';

	private readonly botUserId: string;

	private readonly requestEventHandler: RequestEventHandler;
	private readonly testingRequestEventHandler: TestingRequestEventHandler;

	constructor( botUserId: string, internalChannels: Map<string, string> ) {
		this.botUserId = botUserId;

		this.requestEventHandler = new RequestEventHandler( internalChannels );
		this.testingRequestEventHandler = new TestingRequestEventHandler();
	}

	// This syntax is used to ensure that `this` refers to the `MessageEventHandler` object
	public onEvent = async ( message: Message ): Promise<void> => {
		message = await DiscordUtil.fetchMessage( message );

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
		} else if ( BotConfig.request.testingRequestChannels && BotConfig.request.testingRequestChannels.includes( message.channel.id ) ) {
			// This message is in a testing request channel
			await this.testingRequestEventHandler.onEvent( message );

			// We want the bot to create embeds in testing channels if someone only posts only a ticket ID
			// so that people know what the issue is about
		}

		await CommandExecutor.checkCommands( message );
	};
}