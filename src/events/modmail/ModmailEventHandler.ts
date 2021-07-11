import { Message, TextChannel } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from '../../BotConfig';
import DiscordUtil from '../../util/DiscordUtil';
import EventHandler from '../EventHandler';

export default class ModmailEventHandler implements EventHandler<'message'> {
	public readonly eventName = 'message';

	private logger = log4js.getLogger( 'ModmailEventHandler' );

	// This syntax is used to ensure that `this` refers to the `ModmailEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		const modmailChannel = await DiscordUtil.getChannel( BotConfig.modmailChannel );
		
		const banStatus = BotConfig.database.prepare( `SELECT user FROM modmail_bans WHERE user = ?` ).get( origin.author.toString() );

		if ( modmailChannel instanceof TextChannel && banStatus === undefined ) {
			try {
				await modmailChannel.send( `${ origin.author }: ${ origin.content }` );
			} catch ( e ) {
				this.logger.error( e );

				return;
			}
		} else if ( banStatus !== undefined ) {
			try {
				await origin.channel.send( "We're sorry, but you have been banned from sending any further modmail messages." );
			} catch ( e ) {
				this.logger.error( e );

				return;
			}
		}
	};
}
