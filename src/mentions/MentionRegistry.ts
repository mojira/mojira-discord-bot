import { Mention } from './Mention';
import { SingleMention } from './SingleMention';
import { MultipleMention } from './MultipleMention';
import { Channel } from 'discord.js';

export class MentionRegistry {
	public static getMention( tickets: string[], channel: Channel ): Mention {
		if ( tickets.length == 1 ) {
			return new SingleMention( tickets[0], channel );
		} else {
			return new MultipleMention( tickets );
		}
	}
}