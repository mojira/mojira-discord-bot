import { GuildChannel, Message } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../../BotConfig.js';
import DiscordUtil from '../../util/DiscordUtil.js';
import { RequestsUtil } from '../../util/RequestsUtil.js';
import EventHandler from '../EventHandler.js';

export default class TestingRequestEventHandler implements EventHandler<'messageCreate'> {
	public readonly eventName = 'messageCreate';

	private logger = log4js.getLogger( 'RequestEventHandler' );

	// This syntax is used to ensure that `this` refers to the `TestingRequestEventHandler` object
	public onEvent = async ( request: Message ): Promise<void> => {
		if ( !request.channel.isSendable() ) {
			return;
		}
		if ( request.channel instanceof GuildChannel ) {
			this.logger.info( `${ request.author.tag } posted request ${ request.id } in #${ request.channel.name }` );
		}

		const guildMember = request?.guild?.members?.resolve( request.author );

		if ( guildMember && !guildMember.permissionsIn( BotConfig.request.logChannel ).has( 'ViewChannel' ) ) {
			const tickets = RequestsUtil.getTicketIdsFromString( request.content );

			if ( tickets.length !== 1 ) {
				if ( request.deletable ) {
					try {
						await request.delete();
					} catch ( error ) {
						this.logger.error( error );
					}
				}

				try {
					const warning = await request.channel.send( `${ request.author }, your request doesn't contain exactly one ticket reference.` );
					await DiscordUtil.deleteWithDelay( warning, BotConfig.request.warningLifetime );
				} catch ( error ) {
					this.logger.error( error );
				}

				return;
			}

			if ( BotConfig.request.invalidRequestJql ) {
				if ( !await RequestsUtil.checkTicketValidity( tickets ) ) {
					if ( request.deletable ) {
						try {
							await request.delete();
						} catch ( error ) {
							this.logger.error( error );
						}
					}

					try {
						const warning = await request.channel.send( `${ request.author }, your request contains a ticket that is less than 24 hours old. Please wait until it is at least one day old before making a request.` );
						await DiscordUtil.deleteWithDelay( warning, BotConfig.request.warningLifetime );
					} catch ( error ) {
						this.logger.error( error );
					}
					return;
				}
			}
		}
	};
}
