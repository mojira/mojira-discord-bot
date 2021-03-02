import { EmbedField, Message, TextChannel, User } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from '../BotConfig';
import DiscordUtil from './DiscordUtil';
import MentionCommand from '../commands/MentionCommand';
import MojiraBot from '../MojiraBot';

interface OriginIds {
	channelId: string;
	messageId: string;
}

export class RequestsUtil {
	private static logger = log4js.getLogger( 'RequestsUtil' );

	private static getOriginIdsFromField( field: EmbedField ): OriginIds | undefined {
		try {
			const url = field.value;

			const messageUrl = url.match( /\((.*)\)/ )[1];
			const parts = messageUrl.split( '/' );

			const channelId = parts[parts.length - 2];
			const messageId = parts[parts.length - 1];

			if ( channelId && messageId ) {
				return { channelId, messageId };
			} else {
				return undefined;
			}
		} catch ( ignored ) {
			// The field doesn't contain a valid message URL.
			return undefined;
		}
	}

	public static async getOriginIds( message: Message ): Promise<OriginIds | undefined> {
		try {
			const embeds = message.embeds;
			if ( embeds.length == 0 ) {
				const warning = await message.channel.send( `${ message.author }, this is not a valid log message.` );

				const timeout = BotConfig.request.warningLifetime;
				await warning.delete( { timeout } );
			}

			// Assume first embed is the actual message.
			const fields = embeds[0].fields;
			// Assume either the first field or the last field contains the link to the original message.
			return this.getOriginIdsFromField( fields[0] ) ?? this.getOriginIdsFromField( fields[fields.length - 1] );
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

	public static async checkTicketValidity( ticketKeyString: string ): Promise<boolean> {
		try {
			const searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJqlGet( {
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
		if ( matches ) {
			return matches.length;
		} else {
			return 0;
		}
	}
}