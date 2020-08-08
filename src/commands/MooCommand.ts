import { Message, RichEmbed } from 'discord.js';
import PrefixCommand from './PrefixCommand';
import { SingleMention } from '../mentions/SingleMention';
import { ReactionsUtil } from '../util/ReactionsUtil';

export default class MooCommand extends PrefixCommand {
	public readonly aliases = ['moo', 'cow'];

	public async run( message: Message, args: string ): Promise<boolean> {
		if ( args.length ) {
			return false;
		}

		try {
			new SingleMention( 'MC-772' );
			let embed: RichEmbed; 
			await message.channel.send( embed );
			await ReactionsUtil.reactToMessage( embed, ['🐄','🥛'] );
		} catch {
			return false;
		}

		return true;
	}

	public asString(): string {
		return '!jira moo';
	}
}
