import { Mention } from './Mention.js';
import { SingleMention } from './SingleMention.js';
import { MultipleMention } from './MultipleMention.js';

export class MentionRegistry {
	public static getMention( tickets: string[] ): Mention {
		if ( tickets.length == 1 ) {
			return new SingleMention( tickets[0] );
		} else {
			return new MultipleMention( tickets );
		}
	}
}
