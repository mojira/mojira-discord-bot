import { EmbedBuilder, TextChannel, NewsChannel, CommandInteraction } from 'discord.js';
import PermissionRegistry from '../permissions/PermissionRegistry.js';
import SlashCommand from './commandHandlers/SlashCommand.js';

export default class SendCommand extends SlashCommand {
	public readonly slashCommandBuilder = this.slashCommandBuilder
		.setName( 'send' )
		.setDescription( 'Send a message to a channel as the bot.' )
		.addChannelOption( option =>
			option.setName( 'channel' )
				.setDescription( 'The channel to send the message to.' )
				.setRequired( true )
		)
		.addStringOption( option =>
			option.setName( 'message-type' )
				.setDescription( 'The type of message to send. Either text or embed.' )
				.setRequired( true )
				.addChoice( 'text', 'text' )
				.addChoice( 'embed', 'embed' )
		)
		.addStringOption( option =>
			option.setName( 'message' )
				.setDescription( 'The message to send.' )
				.setRequired( true )
		);

	public readonly permissionLevel = PermissionRegistry.OWNER_PERMISSION;

	public async run( interaction: CommandInteraction ): Promise<boolean> {
		const channel = interaction.options.getChannel( 'channel' );
		const messageType = interaction.options.getString( 'message-type' );
		const content = interaction.options.getString( 'message' );

		if ( channel instanceof TextChannel || channel instanceof NewsChannel ) {
			if ( messageType === 'text' ) {
				try {
					await channel.send( content );
					await interaction.reply( { content: 'Message sent.' } );
				} catch {
					return false;
				}
			} else if ( messageType === 'embed' ) {
				try {
					const embed = new EmbedBuilder();
					embed.setDescription( content );
					await channel.send( { embeds: [embed] } );
					await interaction.reply( { content: 'Message sent.' } );
				} catch {
					return false;
				}
			}
		} else {
			await interaction.reply( { content: `**Error:** ${ channel.name } is not a valid channel. `, ephemeral: true } );
			return true;
		}

		return true;
	}
}
