import { Message, TextChannel } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from '../BotConfig';
import DiscordUtil from './DiscordUtil';

export class RequestsUtil {
	private static logger = log4js.getLogger( 'RequestsUtil' );

	public static async getOriginIds( message: Message ): Promise<{ channelId: string; messageId: string } | undefined> {
		try {
			const embeds = message.embeds;
			if ( embeds.length == 0 ) {
				const warning = await message.channel.send( `${ message.author }, this is not a valid log message.` );

				const timeout = BotConfig.request.noLinkWarningLifetime;
				await warning.delete( { timeout } );
			}

			// Assume first embed is the actual message.
			const embed = embeds[0];
			// Assume the last field contains the link to the original message.
			const url: string = embed.fields[embed.fields.length - 1].value;

			const messageUrl = url.match( /\((.*)\)/ )[1];
			const parts = messageUrl.split( '/' );

			const channelId = parts[parts.length - 2];
			const messageId = parts[parts.length - 1];

			if ( !channelId || !messageId ) {
				throw new Error( `Failed to get channel ID and message ID from "${ url }"` );
			}

			return { channelId, messageId };
		} catch ( error ) {
			this.logger.error( error );
			return undefined;
		}
	}

	public static async getOriginMessage( internalMessage: Message ): Promise<Message | undefined> {
		const ids = await this.getOriginIds( internalMessage );

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