import { MessageEmbed, MessageReaction, TextChannel, User } from 'discord.js';
import { RequestsUtil } from '../../util/RequestsUtil';
import * as log4js from 'log4js';
import BotConfig from '../../BotConfig';
import DiscordUtil from '../../util/DiscordUtil';
import EventHandler from '../EventHandler';
import RequestEventHandler from './RequestEventHandler';

export default class RequestReopenEventHandler implements EventHandler<'messageReactionAdd'> {
	public readonly eventName = 'messageReactionAdd';

	private logger = log4js.getLogger( 'RequestReopenEventHandler' );

	private readonly botUserId: string;
	private readonly requestEventHandler: RequestEventHandler;

	constructor( botUserId: string, requestEventHandler: RequestEventHandler ) {
		this.botUserId = botUserId;
		this.requestEventHandler = requestEventHandler;
	}

	// This syntax is used to ensure that `this` refers to the `RequestReopenEventHandler` object
	public onEvent = async ( { message }: MessageReaction, user: User ): Promise<void> => {
		this.logger.info( `User ${ user.tag } is reopening the request message '${ message.id }'` );

		message = await DiscordUtil.fetchMessage( message );

		if ( message.author.id !== this.botUserId ) {
			return;
		}

		const requestMessage = await RequestsUtil.getOriginMessage( message );

		const logChannel = await DiscordUtil.getChannel( BotConfig.request.logChannel );
		if ( logChannel && logChannel instanceof TextChannel ) {
			const log = new MessageEmbed()
				.setColor( 'ORANGE' )
				.setAuthor( requestMessage.author.tag, requestMessage.author.avatarURL() )
				.setDescription( requestMessage.content )
				.addField( 'Message', `[Here](${ requestMessage.url })`, true )
				.addField( 'Channel', requestMessage.channel.toString(), true )
				.addField( 'Created', requestMessage.createdAt.toUTCString(), false )
				.setFooter( `${ user.tag } reopened this request`, user.avatarURL() )
				.setTimestamp( new Date() );

			try {
				await logChannel.send( log );
			} catch ( error ) {
				this.logger.error( error );
			}
		}

		await this.requestEventHandler.onEvent( requestMessage );
	};
}