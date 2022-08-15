import { Mention } from './Mention.js';
import { SingleMention } from './SingleMention.js';
import { MultipleMention } from './MultipleMention.js';
import { TextBasedChannel } from 'discord.js';

export class MentionRegistry {
	public static getMention( tickets: string[], channel: TextBasedChannel ): Mention {
		if ( tickets.length == 1 ) {
			return new SingleMention( tickets[0], channel );
		} else {
			return new MultipleMention( tickets );
		}
	}
}
