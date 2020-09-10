import * as log4js from 'log4js';
import { Message, MessageEmbed, TextChannel } from 'discord.js';
import { RoleGroupConfig } from '../BotConfig';
import MojiraBot from '../MojiraBot';
import { ReactionsUtil } from './ReactionsUtil';

export class RoleSelectionUtil {
	private static logger = log4js.getLogger( 'RoleSelectionUtil' );

	public static async sendRoleSelectionMessage( channel: TextChannel, groupConfig: RoleGroupConfig ): Promise<void> {
		const embed = new MessageEmbed();
		embed
			.setTitle( groupConfig.prompt )
			.setColor( 'AQUA' );
		for ( const role of groupConfig.roles ) {
			const roleEmoji = MojiraBot.client.emojis.cache.get( role.emoji );
			const textEmoji = ( roleEmoji == undefined ) ? '❓' : roleEmoji.toString();
			embed.addField( textEmoji, role.desc );
		}
		let sentMessage: Message | Message[];
		try {
			sentMessage = await channel.send( embed );
		} catch ( err ) {
			this.logger.error( err );
			return;
		}
		if ( sentMessage instanceof Array ) {
			if ( sentMessage.length !== 1 ) {
				this.logger.error( 'Result of sending role selection message was not exactly one message' );
				return;
			} else {
				sentMessage = sentMessage[0];
			}
		}
		ReactionsUtil.reactToMessage( sentMessage as Message, groupConfig.roles.map( role => role.emoji ) );

		// TODO: Ideally we would like to save the message ID automagically.
		this.logger.warn( `Please set the 'messageId' for role selection group '${ groupConfig.prompt }' to '${ ( sentMessage as Message ).id }' in the config.` );
	}
}
