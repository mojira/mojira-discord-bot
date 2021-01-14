import { Message, MessageEmbed, TextChannel } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig, { PrependResponseMessageType } from '../../BotConfig';
import MentionCommand from '../../commands/MentionCommand';
import MojiraBot from '../../MojiraBot';
import DiscordUtil from '../../util/DiscordUtil';
import { ReactionsUtil } from '../../util/ReactionsUtil';
import { RequestsUtil } from '../../util/RequestsUtil';
import EventHandler from '../EventHandler';

export default class RequestEventHandler implements EventHandler<'message'> {
	public readonly eventName = 'message';

	private logger = log4js.getLogger( 'RequestEventHandler' );

	/**
	 * A map from request channel IDs to internal channel objects.
	 */
	private readonly internalChannels: Map<string, string>;

	constructor( internalChannels: Map<string, string> ) {
		this.internalChannels = internalChannels;
	}

	// This syntax is used to ensure that `this` refers to the `RequestEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		if ( origin.type !== 'DEFAULT' ) {
			return;
		}

		if ( origin.channel instanceof TextChannel ) {
			this.logger.info( `${ origin.author.tag } posted request ${ origin.id } in #${ origin.channel.name }` );
		}

		try {
			await origin.reactions.removeAll();
		} catch ( error ) {
			this.logger.error( error );
		}

		const regex = new RegExp( `(?:${ MentionCommand.getTicketLinkRegex().source }|(${ MentionCommand.ticketPattern }))(\\?\\S+)?`, 'g' );

		if ( BotConfig.request.noLinkEmoji && !origin.content.match( regex ) ) {
			try {
				await origin.react( BotConfig.request.noLinkEmoji );
			} catch ( error ) {
				this.logger.error( error );
			}

			try {
				const warning = await origin.channel.send( `${ origin.author }, your request (<${ origin.url }>) doesn't contain any valid ticket reference. If you'd like to add it you can edit your message.` );

				const timeout = BotConfig.request.warningLifetime;
				await warning.delete( { timeout } );
			} catch ( error ) {
				this.logger.error( error );
			}

			return;
		}

		if ( BotConfig.request.invalidRequestJql ) {
			const tickets = this.getTickets( origin.content );
			const searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJqlGet( {
				jql: `(${ BotConfig.request.invalidRequestJql }) AND key in (${ tickets.join( ',' ) })`,
				fields: ['key'],
			} );
			const invalidTickets = searchResults.issues.map( ( { key } ) => key );
			if ( invalidTickets.length > 0 ) {
				try {
					await origin.react( BotConfig.request.invalidTicketEmoji );
				} catch ( error ) {
					this.logger.error( error );
				}

				try {
					const warning = await origin.channel.send( `${ origin.author }, your request (<${ origin.url }>) contains a ticket that is less than 24 hours old. Please wait until it is at least one day old before making a request.` );

					const timeout = BotConfig.request.warningLifetime;
					await warning.delete( { timeout } );
				} catch ( error ) {
					this.logger.error( error );
				}
				return;
			}
		}

		if ( BotConfig.request.waitingEmoji ) {
			try {
				await origin.react( BotConfig.request.waitingEmoji );
			} catch ( error ) {
				this.logger.error( error );
			}
		}

		const internalChannelId = this.internalChannels.get( origin.channel.id );
		const internalChannel = await DiscordUtil.getChannel( internalChannelId );

		if ( internalChannel && internalChannel instanceof TextChannel ) {
			const embed = new MessageEmbed()
				.setColor( RequestsUtil.getEmbedColor() )
				.setAuthor( origin.author.tag, origin.author.avatarURL() )
				.setDescription( this.replaceTicketReferencesWithRichLinks( origin.content, regex ) )
				.addField( 'Go To', `[Message](${ origin.url }) in ${ origin.channel }`, true )
				.setTimestamp( new Date() );

			const response = BotConfig.request.prependResponseMessage == PrependResponseMessageType.Always
				? RequestsUtil.getResponseMessage( origin )
				: '';

			const copy = await internalChannel.send( response, embed ) as Message;

			if ( BotConfig.request.suggestedEmoji ) {
				await ReactionsUtil.reactToMessage( copy, [...BotConfig.request.suggestedEmoji] );
			}
		}
	};

	private getTickets( content: string ): string[] {
		let ticketMatch: RegExpExecArray;
		const regex = MentionCommand.getTicketIdRegex();
		const ticketMatches: string[] = [];
		while ( ( ticketMatch = regex.exec( content ) ) !== null ) {
			ticketMatches.push( ticketMatch[1] );
		}
		return ticketMatches;
	}

	private replaceTicketReferencesWithRichLinks( content: string, regex: RegExp ): string {
		// First, escape all of the following characters with a backslash: [, ], \
		return content.replace( /([[\]\\])/gm, '\\$1' )

		// Only one of the two capture groups ($1 and $2) can catch an ID at the same time.
		// `$1$2` is used to get the ID from either of the two groups.
		// `$3` then is the query parameter (e.g. `?focusedCommentId=<id>`).
			.replace( regex, '[$1$2](https://bugs.mojang.com/browse/$1$2$3)' );
	}
}
