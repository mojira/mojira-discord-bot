import { Message, MessageType, Snowflake } from 'discord.js';
import BotConfig from '../../BotConfig.js';
import CommandExecutor from '../../commands/CommandExecutor.js';
import DiscordUtil from '../../util/DiscordUtil.js';
import EventHandler from '../EventHandler.js';
import RequestEventHandler from '../request/RequestEventHandler.js';
import TestingRequestEventHandler from '../request/TestingRequestEventHandler.js';
import InternalProgressEventHandler from '../internal/InternalProgressEventHandler.js';

export default class MessageEventHandler implements EventHandler<'messageCreate'> {
	public readonly eventName = 'messageCreate';

	private readonly botUserId: Snowflake;

	private readonly requestEventHandler: RequestEventHandler;
	private readonly testingRequestEventHandler: TestingRequestEventHandler;
	private readonly internalProgressEventHandler: InternalProgressEventHandler;

	constructor( botUserId: Snowflake, internalChannels: Map<Snowflake, Snowflake>, requestLimits: Map<Snowflake, number> ) {
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
			message.webhookId

			// Don't reply to own messages
			|| message.author.id === this.botUserId

			// Don't reply to non-default messages
			|| ( message.type !== MessageType.Default && message.type !== MessageType.Reply )
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
