import { Message, TextChannel, RichEmbed } from 'discord.js';
import * as log4js from 'log4js';
import EventHandler from '../EventHandler';
import BotConfig from '../../BotConfig';
import { ReactionsUtil } from '../../util/ReactionsUtil';

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
				.addField( 'Content', origin.content );
			const copy = await internalChannel.send( embed ) as Message;
			if ( BotConfig.request.suggested_emoji ) {
				ReactionsUtil.reactToMessage( copy, BotConfig.request.suggested_emoji );
			}
		}
	};
}