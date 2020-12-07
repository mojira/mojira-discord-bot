import { Message, TextChannel, User } from 'discord.js';
import BotConfig from '../BotConfig';
import DiscordUtil from './DiscordUtil';
import JiraClient from 'jira-connector';
import * as log4js from 'log4js';
import MentionCommand from '../commands/MentionCommand';
import c from 'config';

export class RequestsUtil {
	private static logger = log4js.getLogger( 'RequestsUtil' );

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

	// https://stackoverflow.com/a/3426956
	private static hashCode( str: string ): number {
		let hash = 0;
		for ( let i = 0; i < str.length; i++ ) {
			hash = str.charCodeAt( i ) + ( ( hash << 5 ) - hash );
		}
		return hash;
	}

	// https://stackoverflow.com/a/3426956
	public static getEmbedColor( resolver?: User ): 'BLUE' | number {
		if ( !resolver ) {
			return 'BLUE';
		}
		return this.hashCode( resolver.tag ) & 0x00FFFFFF;
	}

	public static async checkTicketValidity( jira: JiraClient, ticketKeyString: string ): Promise<boolean> {
		try {
			const searchResults = await jira.search.search( {
				jql: `(${ BotConfig.request.invalidRequestJql }) AND key in (${ ticketKeyString })`,
				fields: ['key'],
			} );
			const invalidTickets = searchResults.issues.map( ( { key } ) => key );
			if ( invalidTickets.length > 0 ) {
				return false;
			} else {
				return true;
			}
		} catch ( err ) {
			this.logger.error( err );
			return false;
		}
	}

	public static checkTicketLinks( content: string ): number {
		const regex = new RegExp( `(?:${ MentionCommand.getTicketLinkRegex().source }|(${ MentionCommand.ticketPattern }))(\\?\\S+)?`, 'g' );
		const matches = content.match( regex );
		return matches.length;
	}
}