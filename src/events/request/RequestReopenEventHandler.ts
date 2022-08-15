import { EmbedBuilder, MessageReaction, TextChannel, User } from 'discord.js';
import { RequestsUtil } from '../../util/RequestsUtil.js';
import log4js from 'log4js';
import BotConfig from '../../BotConfig.js';
import DiscordUtil from '../../util/DiscordUtil.js';
import EventHandler from '../EventHandler.js';
import RequestEventHandler from './RequestEventHandler.js';

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

		if ( requestMessage === undefined ) {
			this.logger.error( `Could not find origin message for request message '${ message.id }'` );
			return;
		}

		const logChannel = await DiscordUtil.getChannel( BotConfig.request.logChannel );
		if ( logChannel && logChannel instanceof TextChannel ) {
			const log = new EmbedBuilder()
				.setColor( 'Orange' )
				.setAuthor( { name: requestMessage.author.tag, iconURL: requestMessage.author.avatarURL() ?? undefined } )
				.setDescription( requestMessage.content )
				.addFields(
					{ name: 'Message', value: `[Here](${ requestMessage.url })`, inline: true },
					{ name: 'Channel', value: requestMessage.channel.toString(), inline: true },
					{ name: 'Created', value: requestMessage.createdAt.toUTCString(), inline: false }
				)
				.setFooter( { text: `${ user.tag } reopened this request`, iconURL: user.avatarURL() ?? undefined } )
				.setTimestamp( new Date() );

			try {
				await logChannel.send( { embeds: [log] } );
			} catch ( error ) {
				this.logger.error( error );
			}
		}

		await this.requestEventHandler.onEvent( requestMessage, true );
	};
}
