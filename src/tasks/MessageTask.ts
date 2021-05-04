import { Message } from 'discord.js';

export default abstract class MessageTask {
	public abstract run( message: Message ): Promise<void>;
}
