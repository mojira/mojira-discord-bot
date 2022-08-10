import log4js from 'log4js';
import { EmbedBuilder, Message, TextChannel } from 'discord.js';
import { RoleGroupConfig } from '../BotConfig.js';
import MojiraBot from '../MojiraBot.js';
import { ReactionsUtil } from './ReactionsUtil.js';
import DiscordUtil from './DiscordUtil.js';

export class RoleSelectionUtil {
	private static logger = log4js.getLogger( 'RoleSelectionUtil' );

	public static async updateRoleSelectionMessage( groupConfig: RoleGroupConfig ): Promise<void> {
		const embed = new EmbedBuilder();
		embed.setTitle( groupConfig.prompt )
			.setColor( groupConfig.color );

		if ( groupConfig.desc ) {
			embed.setDescription( groupConfig.desc );
		}

		for ( const role of groupConfig.roles ) {
			const emoji = MojiraBot.client.emojis.resolve( role.emoji ) ?? role.emoji;

			embed.addFields( { name: `${ emoji.toString() }\u2002${ role.title }`, value: role.desc ?? '\u200b' } );
		}

		const channel = await DiscordUtil.getChannel( groupConfig.channel );

		if ( !( channel instanceof TextChannel ) ) {
			throw new Error( `Channel ${ groupConfig.channel } is not a text channel` );
		}

		let message: Message | undefined;

		if ( groupConfig.message === undefined ) {
		// No message has been configured in the config, so create a new one that should then be set in the config
			message = await channel.send( { embeds: [embed] } );

			// TODO: Ideally we would like to save the message ID automagically.
			this.logger.warn( `Please set the 'message' for role selection group '${ groupConfig.prompt }' to '${ message.id }' in the config.` );
			groupConfig.message = message.id;
		} else {
			message = await DiscordUtil.getMessage( channel, groupConfig.message );
		}

		if ( message === undefined ) {
			// The role message could not be found, so a new one is created
			message = await channel.send( { embeds: [embed] } );

			// TODO: Ideally we would like to save the message ID automagically.
			this.logger.warn(
				'Role message could not be found, and therefore a new one was created. ' +
				`Please set the 'message' for role selection group '${ groupConfig.prompt }' to '${ message.id }' in the config.`
			);
		}

		// Check if role message needs to be updated
		if ( message.embeds.length == 1 ) {
			const existingEmbed = message.embeds[0];

			if ( existingEmbed.equals( embed.data ) ) {
				// Role message does not need to be updated, nothing else left to do
				return;
			}
		}

		// Update role message
		await message.edit( { embeds: [embed] } );
		await ReactionsUtil.reactToMessage( message, groupConfig.roles.map( role => role.emoji ) );
	}
}
