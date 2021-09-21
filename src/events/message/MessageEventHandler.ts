import { DMChannel, Message, Snowflake } from 'discord.js';
import BotConfig from '../../BotConfig';
import CommandExecutor from '../../commands/CommandExecutor';
import DiscordUtil from '../../util/DiscordUtil';
import EventHandler from '../EventHandler';
import RequestEventHandler from '../request/RequestEventHandler';
import TestingRequestEventHandler from '../request/TestingRequestEventHandler';
import InternalProgressEventHandler from '../internal/InternalProgressEventHandler';
import ModmailEventHandler from '../modmail/ModmailEventHandler';
import ModmailReplyEventHandler from '../modmail/ModmailReplyEventHandler';

export default class MessageEventHandler implements EventHandler<'messageCreate'> {
	public readonly eventName = 'messageCreate';

	private readonly botUserId: Snowflake;

	private readonly requestEventHandler: RequestEventHandler;
	private readonly testingRequestEventHandler: TestingRequestEventHandler;
	private readonly internalProgressEventHandler: InternalProgressEventHandler;
	private readonly modmailEventHandler: ModmailEventHandler;
	private readonly modmailReplyEventHandler: ModmailReplyEventHandler;

	constructor( botUserId: Snowflake, internalChannels: Map<Snowflake, Snowflake>, requestLimits: Map<Snowflake, number> ) {
		this.botUserId = botUserId;

		this.requestEventHandler = new RequestEventHandler( internalChannels, requestLimits );
		this.testingRequestEventHandler = new TestingRequestEventHandler();
		this.internalProgressEventHandler = new InternalProgressEventHandler();
		this.modmailEventHandler = new ModmailEventHandler();
		this.modmailReplyEventHandler = new ModmailReplyEventHandler();
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
			|| ( message.type !== 'DEFAULT' && message.type !== 'REPLY' )
		) return;

		// Only true if the message is in a DM channel
		if ( message.partial ) {
			await message.fetch();
		}

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
		} else if ( message.channel instanceof DMChannel && BotConfig.modmailEnabled ) {
			// This message is in a DM channel and modmail is enabled
			await this.modmailEventHandler.onEvent( message );

			// Don't reply in DM channels
			return;
		} else if ( message.channelId == BotConfig.modmailChannel && BotConfig.modmailEnabled ) {
			if ( message.type == 'REPLY' ) {
				// This message is in the modmail channel and is a reply
				await this.modmailReplyEventHandler.onEvent( message );
			}

			// Don't reply in modmail channels
			return;
		}

		await CommandExecutor.checkCommands( message );
	};
}