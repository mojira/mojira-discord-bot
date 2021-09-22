import { Message } from 'discord.js';
import BotConfig from '../../BotConfig';
import CommandExecutor from '../../commands/CommandExecutor';
import DiscordUtil from '../../util/DiscordUtil';
import EventHandler from '../EventHandler';
import RequestEventHandler from '../request/RequestEventHandler';
import TestingRequestEventHandler from '../request/TestingRequestEventHandler';
import InternalProgressEventHandler from '../internal/InternalProgressEventHandler';

export default class MessageEventHandler implements EventHandler<'message'> {
	public readonly eventName = 'message';

	private readonly botUserId: string;

	private readonly requestEventHandler: RequestEventHandler;
	private readonly testingRequestEventHandler: TestingRequestEventHandler;
	private readonly internalProgressEventHandler: InternalProgressEventHandler;

	constructor( botUserId: string, internalChannels: Map<string, string>, requestLimits: Map<string, number> ) {
		this.botUserId = botUserId;

		this.requestEventHandler = new RequestEventHandler( internalChannels, requestLimits );
		this.testingRequestEventHandler = new TestingRequestEventHandler();
		this.internalProgressEventHandler = new InternalProgressEventHandler();
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
		} else if ( BotConfig.request.internalChannels && BotConfig.request.internalChannels.includes( message.channel.id ) ) {
			// This message is in an internal channel
			await this.internalProgressEventHandler.onEvent( message );

			// Don't reply in internal request channels
			return;
		}

		await CommandExecutor.checkCommands( message );
	};
}