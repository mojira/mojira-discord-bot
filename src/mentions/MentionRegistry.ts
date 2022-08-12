import { Mention } from './Mention.js';
import { SingleMention } from './SingleMention.js';
import { MultipleMention } from './MultipleMention.js';
import { TextBasedChannels } from 'discord.js';

export class MentionRegistry {
	public static getMention( tickets: string[], channel: TextBasedChannels ): Mention {
		if ( tickets.length == 1 ) {
			return new SingleMention( tickets[0], channel );
		} else {
			return new MultipleMention( tickets );
		}
	}
}
