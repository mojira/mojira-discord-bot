import { Message } from 'discord.js';
import PrefixCommand from './PrefixCommand';
import { SingleMention } from './SingleMention';

export default class PingCommand extends PrefixCommand {
	public readonly aliases = ['moo', 'test'];

	public async run( message: Message, args: string ): Promise<boolean> {
		if ( args.length ) {
			return false;
		}
		try {
			await message.react( '🐄' );
		} catch {
			return false;
		}

		try {
			await message.react( '🥛' );
		} catch {
			return false;
		}

		try {
			return new SingleMention( "MC-772" );
		} catch {
			return false;
		}

	}

	public asString(): string {
		return '!jira moo';
	}
}
