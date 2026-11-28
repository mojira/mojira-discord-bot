import { Message, PartialMessage } from 'discord.js';

export default abstract class MessageTask {
	public abstract run( message: Message | PartialMessage ): Promise<void>;
}
