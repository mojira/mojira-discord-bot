import { Message, TextChannel, RichEmbed, MessageReaction, User } from 'discord.js';
import * as log4js from 'log4js';
import EventHandler from '../EventHandler';
import BotConfig, { PrependResponseMessageType } from '../../BotConfig';
import { ReactionsUtil } from '../../util/ReactionsUtil';
import MentionCommand from '../../commands/MentionCommand';
import { RequestsUtil } from '../../util/RequestsUtil';
import MojiraBot from '../../MojiraBot';

export default class NewRequestEventHandler implements EventHandler {
	public readonly eventName = '';

	private logger = log4js.getLogger( 'NewRequestEventHandler' );

	private readonly instance: this;

	/**
	 * A map from request channel IDs to internal channel objects.
	 */
	private readonly internalChannels: Map<string, TextChannel>;

	constructor( internalChannels: Map<string, TextChannel> ) {
		if ( this.instance ) {
			return this.instance;
		}
		this.internalChannels = internalChannels;
		this.instance = this;
	}

	// This syntax is used to ensure that `this` refers to the `NewRequestEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		if ( origin.type !== 'DEFAULT' ) {
			return;
		}

		this.logger.info( `User ${ origin.author.tag } posted a new request to requests channel ${ origin.channel.id }` );

		this.handleNewRequest( origin );
	};

	// This syntax is used to ensure that `this` refers to the `NewRequestEventHandler` object
	public onReopen = async ( reaction: MessageReaction, user: User ): Promise<void> => {
		this.logger.info( `User ${ user.tag } is reopening the request message '${ reaction.message.id }'` );

		const logMessage = reaction.message;
		const embeds = logMessage.embeds;
		if ( embeds.length == 0 ) {
			const warning = await logMessage.channel.send( `${ logMessage.author }, this is not a valid log message.` ) as Message;
			warning.delete( BotConfig.request.no_link_warning_lifetime || 0 );
		}

		// Assume first embed is the log message
		const logEmbed = embeds[0];
		const url: string = logEmbed.fields[logEmbed.fields.length - 1].value;
		const messageUrl = url.match( /\((.*)\)/ )[1];
		const parts = messageUrl.split( '/' );

		const originalChannel = logMessage.client.channels.get( parts[parts.length - 2] );
		if ( originalChannel instanceof TextChannel ) {
			originalChannel.fetchMessages( { around: parts[parts.length - 1], limit: 1 } )
				.then( async messages => {
					const requestMessage = messages.first();

					await requestMessage.clearReactions();
					await this.handleNewRequest( requestMessage );

					const logChannel = MojiraBot.client.channels.get( BotConfig.request.log_channel );
					if ( logChannel && logChannel instanceof TextChannel ) {

						const log = new RichEmbed()
							.setColor( 'ORANGE' )
							.setAuthor( requestMessage.author.tag, requestMessage.author.avatarURL )
							.setDescription( requestMessage.content )
							.addField( 'Channel', requestMessage.channel.toString(), true )
							.addField( 'Message', `[Here](${ requestMessage.url })`, true )
							.setFooter( `${ user.tag } reopened this request`, user.avatarURL )
							.setTimestamp( new Date() );
						logChannel.send( log );
					}
				} );
		}
	};

	public handleNewRequest = async ( origin: Message ): Promise<void> => {
		await origin.clearReactions();

		const regex = new RegExp( `(?:${ MentionCommand.ticketLinkRegex.source }|(${ MentionCommand.ticketPattern }))(\\?\\S+)?`, 'g' );

		if ( BotConfig.request.no_link_emoji && !origin.content.match( regex ) ) {
			origin.react( BotConfig.request.no_link_emoji );
			const warning = await origin.channel.send( `${ origin.author }, your request doesn't contain any valid ticket reference. If you'd like to add it you can edit your message.` ) as Message;
			warning.delete( BotConfig.request.no_link_warning_lifetime || 0 );
			return;
		}

		if ( BotConfig.request.waiting_emoji ) {
			origin.react( BotConfig.request.waiting_emoji );
		}

		const internalChannel = this.internalChannels.get( origin.channel.id );
		if ( internalChannel ) {
			const embed = new RichEmbed()
				.setColor( 'BLUE' )
				.setAuthor( origin.author.tag, origin.author.avatarURL )
				.setDescription( this.replaceTicketReferencesWithRichLinks( origin.content, regex ) )
				.addField( 'Go To', `[Message](${ origin.url }) in ${ origin.channel }`, true )
				.addField( 'Channel', origin.channel.id, true )
				.addField( 'Message', origin.id, true )
				.setTimestamp( new Date() );
			const response = BotConfig.request.prepend_response_message == PrependResponseMessageType.Always ?
				RequestsUtil.getResponseMessage( origin ) : '';
			const copy = await internalChannel.send( response, embed ) as Message;
			if ( BotConfig.request.suggested_emoji ) {
				ReactionsUtil.reactToMessage( copy, [...BotConfig.request.suggested_emoji] );
			}
		}
	};

	private replaceTicketReferencesWithRichLinks( content: string, regex: RegExp ): string {
		// Only one of the two capture groups ($1 and $2) can catch an ID at the same time.
		// `$1$2` is used to get the ID from either of the two groups.
		return content.replace( regex, '[$1$2](https://bugs.mojang.com/browse/$1$2$3)' );
	}
}
