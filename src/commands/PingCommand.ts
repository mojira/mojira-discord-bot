import { Message } from 'discord.js';
import PrefixCommand from './PrefixCommand';

export default class PingCommand extends PrefixCommand {
	public readonly aliases = ['ping', 'test'];

	public async run( message: Message, args: string ): Promise<boolean> {
		if ( args.length ) {
			return false;
		}

		try {
			await message.channel.send( `${ message.author.toString() } Pong!` );
		} catch {
			return false;
		}

		try {
			await message.react( '🏓' );
		} catch {
			return false;
		}

		return true;
	}

	public asString(): string {
		return '!jira ping';
	}
}
