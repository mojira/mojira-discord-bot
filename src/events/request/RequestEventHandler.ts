import { Message, MessageEmbed, TextChannel } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig, { PrependResponseMessageType } from '../../BotConfig';
import MentionCommand from '../../commands/MentionCommand';
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

		this.logger.info( `User ${ origin.author.tag } posted a new request to requests channel ${ origin.channel.id }` );

		await origin.reactions.removeAll();

		const regex = new RegExp( `(?:${ MentionCommand.ticketLinkRegex.source }|(${ MentionCommand.ticketPattern }))(\\?\\S+)?`, 'g' );

		if ( BotConfig.request.noLinkEmoji && !origin.content.match( regex ) ) {
			origin.react( BotConfig.request.noLinkEmoji );
			const timeout = BotConfig.request.noLinkWarningLifetime;
			const warning = await origin.channel.send( `${ origin.author }, your request doesn't contain any valid ticket reference. If you'd like to add it you can edit your message.` ) as Message;
			warning.delete( { timeout } );
			return;
		}

		if ( BotConfig.request.waitingEmoji ) {
			origin.react( BotConfig.request.waitingEmoji );
		}

		const internalChannelId = this.internalChannels.get( origin.channel.id );
		const internalChannel = await DiscordUtil.getChannel( internalChannelId );

		if ( internalChannel && internalChannel instanceof TextChannel ) {
			const embed = new MessageEmbed()
				.setColor( 'BLUE' )
				.setAuthor( origin.author.tag, origin.author.avatarURL() )
				.setDescription( this.replaceTicketReferencesWithRichLinks( origin.content, regex ) )
				.addField( 'Go To', `[Message](${ origin.url }) in ${ origin.channel }`, true )
				.addField( 'Channel', origin.channel.id, true )
				.addField( 'Message', origin.id, true )
				.setTimestamp( new Date() );
			const response = BotConfig.request.prependResponseMessage == PrependResponseMessageType.Always ?
				RequestsUtil.getResponseMessage( origin ) : '';
			const copy = await internalChannel.send( response, embed ) as Message;
			if ( BotConfig.request.suggestedEmoji ) {
				ReactionsUtil.reactToMessage( copy, [...BotConfig.request.suggestedEmoji] );
			}
		}
	};

	private replaceTicketReferencesWithRichLinks( content: string, regex: RegExp ): string {
		// Only one of the two capture groups ($1 and $2) can catch an ID at the same time.
		// `$1$2` is used to get the ID from either of the two groups.
		return content.replace( regex, '[$1$2](https://bugs.mojang.com/browse/$1$2$3)' );
	}
}
