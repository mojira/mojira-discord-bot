import { APIEmbedField, Message, PartialMessage, Snowflake, TextChannel, User } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../BotConfig.js';
import DiscordUtil from './DiscordUtil.js';
import MentionCommand from '../commands/MentionCommand.js';
import MojiraBot from '../MojiraBot.js';

interface OriginIds {
	channelId: Snowflake;
	messageId: Snowflake;
}

export class RequestsUtil {
	private static logger = log4js.getLogger( 'RequestsUtil' );

	private static getOriginIdsFromField( field: APIEmbedField ): OriginIds | undefined {
		try {
			const url = field.value;

			const matches = url.match( /\((.*)\)/ );
			if ( matches === null ) return undefined;

			const messageUrl = matches[1];
			const parts = messageUrl.split( '/' );

			const channelId = parts[parts.length - 2] as Snowflake;
			const messageId = parts[parts.length - 1] as Snowflake;

			if ( channelId && messageId ) {
				return { channelId, messageId };
			} else {
				return undefined;
			}
		} catch {
			// The field doesn't contain a valid message URL.
			return undefined;
		}
	}

	public static async getOriginIds( message: Message | PartialMessage ): Promise<OriginIds | undefined> {
		try {
			const embeds = message.embeds;
			if ( embeds.length == 0 ) return undefined;

			// Assume first embed is the actual message.
			const fields = embeds[0].fields;
			// Assume either the first field or the last field contains the link to the original message.
			return this.getOriginIdsFromField( fields[0] ) ?? this.getOriginIdsFromField( fields[fields.length - 1] );
		} catch ( error ) {
			this.logger.error( error );
			return undefined;
		}
	}

	public static async getOriginMessage( internalMessage: Message | PartialMessage ): Promise<Message | undefined> {
		const ids = await this.getOriginIds( internalMessage );

		if ( !ids ) {
			return undefined;
		}

		try {
			const originChannel = await DiscordUtil.getChannel( ids.channelId );
			if ( originChannel instanceof TextChannel ) {
				return await DiscordUtil.getMessage( originChannel, ids.messageId );
			}
		} catch {
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
	public static getEmbedColor( resolver?: User ): 'Blue' | number {
		if ( !resolver ) {
			return 'Blue';
		}
		return this.hashCode( resolver.tag ) & 0x00FFFFFF;
	}


	/**
	 * This extracts a ticket ID from either a link or a standalone ticket ID.
	 * E.g. this matches the "MC-1234" in https://bugs.mojang.browse/MC-1234 or in "This is some crazy bug:MC-1234".
	 * @returns A NEW regex object every time. You have to store it as a variable if you use `exec` on it, otherwise you will encounter infinite loops.
	 */
	public static getTicketRequestRegex(): RegExp {
		return new RegExp( `<?(?:https?://(?:report\\.)?bugs\\.mojang\\.com/(?:browse(?:/\\w+/issues)?|projects/\\w+/issues|servicedesk/customer/portal/\\d+)/|\\b)${ MentionCommand.ticketPattern }>?`, 'g' );
	}

	public static async checkTicketValidity( tickets: string[] ): Promise<boolean> {
		try {
			this.logger.debug( `Checking for ticket validity of tickets ${ tickets.join( ',' ) }` );
			const searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJql( {
				jql: `(${ BotConfig.request.invalidRequestJql }) AND key in (${ tickets.join( ',' ) })`,
				fields: ['key'],
			} );
			if ( searchResults.issues === undefined ) return false;

			const invalidTickets = searchResults.issues.map( ( { key } ) => key );
			this.logger.debug( `Invalid tickets: [${ invalidTickets.join( ',' ) }]` );
			return invalidTickets.length === 0;
		} catch ( err ) {
			this.logger.error( `Error while checking validity of tickets ${ tickets.join( ',' ) }\n`, err.message );
			return true;
		}
	}

	/**
	 * Gets all ticket IDs from a string, including ticket IDs from URLs.
	 * @param content The string that should be searched for ticket IDs
	 */
	public static getTicketIdsFromString( content: string ): string[] {
		const regex = this.getTicketRequestRegex();

		const tickets: string[] = [];
		for ( const match of content.matchAll( regex ) ) {
			if ( match.groups === undefined ) continue;
			tickets.push( match.groups['ticketid'] );
		}

		return tickets;
	}

	public static getRequestDescription( origin: Message ): string {
		const desc = this.replaceTicketReferencesWithRichLinks( origin.content );
		if ( desc.length > 2048 ) return `⚠ [Request too long to be posted, click here to see the request](${ origin.url })`;
		return desc;
	}

	public static replaceTicketReferencesWithRichLinks( content: string ): string {
		const regex = new RegExp( `${ this.getTicketRequestRegex().source }(?<query>\\?[^\\s#>]+)?(?<anchor>#[^\\s>]+)?>?`, 'g' );

		// Escape all of the following characters with a backslash: [, ], \
		return content.replace( /([[\]\\])/gm, '\\$1' )
			.replace( regex, '[$<ticketid>$<anchor>](https://mojira.atlassian.net/browse/$<ticketid>$<query>$<anchor>)' );
	}
}
