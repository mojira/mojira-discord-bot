import { Message, MessageEmbed, MessageReaction, TextChannel, User } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from '../../BotConfig';
import DiscordUtil from '../../util/DiscordUtil';
import EventHandler from '../EventHandler';
import RequestEventHandler from './RequestEventHandler';

export default class RequestReopenEventHandler implements EventHandler<'messageReactionAdd'> {
	public readonly eventName = 'messageReactionAdd';

	private logger = log4js.getLogger( 'RequestReopenEventHandler' );

	private requestEventHandler: RequestEventHandler;

	constructor( requestEventHandler: RequestEventHandler ) {
		this.requestEventHandler = requestEventHandler;
	}

	// This syntax is used to ensure that `this` refers to the `RequestReopenEventHandler` object
	public onEvent = async ( { message }: MessageReaction, user: User ): Promise<void> => {
		this.logger.info( `User ${ user.tag } is reopening the request message '${ message.id }'` );

		const embeds = message.embeds;
		if ( embeds.length == 0 ) {
			const timeout = BotConfig.request.noLinkWarningLifetime;
			const warning = await message.channel.send( `${ message.author }, this is not a valid log message.` ) as Message;
			warning.delete( { timeout } );
		}

		// Assume first embed is the log message
		const logEmbed = embeds[0];
		const url: string = logEmbed.fields[logEmbed.fields.length - 1].value;
		const messageUrl = url.match( /\((.*)\)/ )[1];
		const parts = messageUrl.split( '/' );

		const originalChannel = await DiscordUtil.getChannel( parts[parts.length - 2] );
		if ( originalChannel instanceof TextChannel ) {
			const requestMessage = await DiscordUtil.getMessage( originalChannel, parts[parts.length - 1] );

			const logChannel = await DiscordUtil.getChannel( BotConfig.request.logChannel );
			if ( logChannel && logChannel instanceof TextChannel ) {
				const log = new MessageEmbed()
					.setColor( 'ORANGE' )
					.setAuthor( requestMessage.author.tag, requestMessage.author.avatarURL() )
					.setDescription( requestMessage.content )
					.addField( 'Channel', requestMessage.channel.toString(), true )
					.addField( 'Message', `[Here](${ requestMessage.url })`, true )
					.setFooter( `${ user.tag } reopened this request`, user.avatarURL() )
					.setTimestamp( new Date() );
				logChannel.send( log );
			}

			await this.requestEventHandler.onEvent( requestMessage );
		}
	};
}