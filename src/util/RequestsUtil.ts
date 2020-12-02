import { Message, TextChannel } from 'discord.js';
import BotConfig from '../BotConfig';
import DiscordUtil from './DiscordUtil';

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

	public static async getOriginMessage( internalMessage: Message ): Promise<Message | undefined> {
		const ids = this.getOriginIds( internalMessage );

		if ( !ids ) {
			return undefined;
		}

		try {
			const originChannel = await DiscordUtil.getChannel( ids.channelId );
			if ( originChannel instanceof TextChannel ) {
				return await DiscordUtil.getMessage( originChannel, ids.messageId );
			}
		} catch ( ignored ) {
			// The channel and/or the message don't exist.
			return undefined;
		}
	}

	public static getResponseMessage( message: Message ): string {
		return ( BotConfig.request.responseMessage || '' )
			.replace( '{{author}}', `@${ message.author.tag }` )
			.replace( '{{url}}', message.url )
			.replace( '{{message}}', message.content.replace( /(^|\n)/g, '$1> ' ) );
	}
}