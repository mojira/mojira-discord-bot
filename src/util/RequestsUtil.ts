import { Message, TextChannel } from 'discord.js';
import MojiraBot from '../MojiraBot';
import BotConfig from '../BotConfig';

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

		const originChannel = MojiraBot.client.channels.get( ids.channelId ) as TextChannel;
		return await originChannel.fetchMessage( ids.messageId );
	}

	public static getResponseMessage( message: Message ): string {
		return ( BotConfig.request.respone_message || '' )
			.replace( '{{author}}', `@${ message.author.tag }` )
			.replace( '{{url}}', message.url )
			.replace( '{{message}}', message.content );
	}
}