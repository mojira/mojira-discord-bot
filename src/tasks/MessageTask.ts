import { Message } from 'discord.js';

export default abstract class MessageTask {
	public abstract async run( message: Message ): Promise<void>;
}
