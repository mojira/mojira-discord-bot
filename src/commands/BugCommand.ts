import { EmbedBuilder, ChatInputCommandInteraction, MessageFlagsBitField, SlashCommandBuilder, SharedSlashCommand } from 'discord.js';
import Command from './commandHandlers/Command.js';
import { MentionRegistry } from '../mentions/MentionRegistry.js';
import BotConfig from '../BotConfig.js';
import { ChannelConfigUtil } from '../util/ChannelConfigUtil.js';
import SlashCommand from './commandHandlers/SlashCommand.js';

export default class BugCommand extends SlashCommand {
	public build(): SharedSlashCommand {
		return new SlashCommandBuilder()
			.setName( 'bug' )
			.setDescription( 'Creates a embed with info from a ticket in Jira.' )
			.addStringOption( option =>
				option.setName( 'ticket-id' )
					.setDescription( 'The ID of the ticket.' )
					.setRequired( true )
			);
	}

	public async run( interaction: ChatInputCommandInteraction ): Promise<boolean> {
		if ( interaction.channel === null ) return false;

		if ( ChannelConfigUtil.commandsDisabled( interaction.channel ) ) return false;

		const tickets = interaction.options.getString( 'ticket-id' )?.split( /\s+/ig );

		if ( tickets == null ) return false;

		const ticketRegex = new RegExp( `\\s*((?:${ BotConfig.projects.join( '|' ) })-\\d+)\\s*` );

		for ( const ticket of tickets ) {
			if ( !ticketRegex.test( ticket ) ) {
				try {
					await interaction.reply( { content: `'${ ticket }' is not a valid ticket ID.`, flags: [MessageFlagsBitField.Flags.Ephemeral] } );
				} catch ( error ) {
					Command.logger.log( error as string );
					return false;
				}
				return true;
			}
		}

		const mention = MentionRegistry.getMention( tickets, interaction.channel );

		let embed: EmbedBuilder;
		try {
			embed = await mention.getEmbed();
		} catch ( error ) {
			try {
				await interaction.reply( { content: error as string, flags: [MessageFlagsBitField.Flags.Ephemeral] } );
			} catch ( innerError ) {
				Command.logger.log( innerError as string );
				return false;
			}
			return true;
		}

		if ( embed === undefined ) return false;

		embed.setFooter( { text: interaction.user.tag, iconURL: interaction.user.avatarURL() ?? undefined } )
			.setTimestamp( interaction.createdAt );

		try {
			await interaction.reply( { embeds: [embed] } );
		} catch ( err ) {
			Command.logger.error( err );
			return false;
		}

		return true;
	}
}
