import { Message } from 'discord.js';

export class RequestsUtil {
	public static getOriginIds( message: Message ): {channelId: string; messageId: string} | undefined {
		let channelId: string;
		let messageId: string;

		if ( message.embeds && message.embeds.length > 0 ) {
			for ( const field of message.embeds[0].fields ) {
				if ( field.name === 'Channel' ) {
					channelId = field.value;
				} else if ( field.name === 'Message' ) {
					messageId = field.value;
				}
			}

			if ( channelId && messageId ) {
				return { channelId, messageId };
			}
		}

		return undefined;
	}
}