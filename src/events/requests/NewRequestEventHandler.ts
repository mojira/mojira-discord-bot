import { Message, TextChannel, RichEmbed } from 'discord.js';
import * as log4js from 'log4js';
import EventHandler from '../EventHandler';
import BotConfig from '../../BotConfig';
import { ReactionsUtil } from '../../util/ReactionsUtil';
import MentionCommand from '../../commands/MentionCommand';

export default class NewRequestEventHandler implements EventHandler {
	public readonly eventName = '';

	private logger = log4js.getLogger( 'NewRequestEventHandler' );
	private readonly internalChannels: Map<string, TextChannel>;

	constructor( internalChannels: Map<string, TextChannel> ) {
		this.internalChannels = internalChannels;
	}

	// This syntax is used to ensure that `this` refers to the `NewRequestEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		this.logger.info( `User ${ origin.author.tag } posted a new request to requests channel ${ origin.channel.id }` );

		if ( BotConfig.request.waiting_emoji ) {
			origin.react( BotConfig.request.waiting_emoji );
		}

		const internalChannel = this.internalChannels.get( origin.channel.id );
		if ( internalChannel ) {
			const embed = new RichEmbed()
				.setColor( '#F7C6C9' )
				.setAuthor( origin.author.tag, origin.author.avatarURL )
				.addField( 'Channel', origin.channel.id, true )
				.addField( 'Message', origin.id, true )
				.addField( 'Content', this.replaceTicketReferenesWithRichLinks( origin.content ) )
				.setTimestamp( new Date() );
			const copy = await internalChannel.send( embed ) as Message;
			if ( BotConfig.request.suggested_emoji ) {
				ReactionsUtil.reactToMessage( copy, BotConfig.request.suggested_emoji );
			}
		}
	};

	private replaceTicketReferenesWithRichLinks( content: string ): string {
		const regex = new RegExp( `(?:${MentionCommand.ticketLinkRegex}|${MentionCommand.ticketIdRegex.source})`, 'g' );
		// Only one of the two capture groups ($1 and $2) can catch an ID at the same time.
		// `$1$2` is used to get the ID from either of the two groups.
		return content.replace( regex, '[$1$2](https://bugs.mojang.com/browse/$1$2)' );
	}
}