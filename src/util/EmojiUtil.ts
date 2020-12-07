import emojiRegex = require( 'emoji-regex/text.js' );

export class EmojiUtil {
	public static getEmoji( args: string ): string {
		const customEmoji = /^<a?:(.+):(\d+)>/;
		const unicodeEmoji = emojiRegex();
		let rawEmoji: string;
		if ( unicodeEmoji.test( args ) ) {
			rawEmoji = args;
		} else if ( customEmoji.test( args ) ) {
			rawEmoji = customEmoji.exec( args )[2];
		} else {
			return;
		}
		return rawEmoji;
	}
}