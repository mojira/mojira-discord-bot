import { Mention } from './Mention';
import { SingleMention } from './SingleMention';
import { MultipleMention } from './MultipleMention';

export class MentionRegistry {
	public static getMention( tickets: string[] ): Mention {
		if ( tickets.length == 1 ) {
			return new SingleMention( tickets[0] );
		} else {
			return new MultipleMention( tickets );
		}
	}
}
