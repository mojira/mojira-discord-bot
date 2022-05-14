import { CommandInteraction, MessageEmbed } from 'discord.js';
import Command from './commandHandlers/Command';
import { MentionRegistry } from '../mentions/MentionRegistry';
import BotConfig from '../BotConfig';
import SlashCommand from './commandHandlers/SlashCommand';

export default class BugCommand extends SlashCommand {
	public slashCommandBuilder = this.slashCommandBuilder
		.setName( 'bug' )
		.setDescription( 'Creates a embed with info from a ticket in Jira.' )
		.addStringOption( option =>
			option.setName( 'ticket-id' )
				.setDescription( 'The ID of the ticket.' )
				.setRequired( true )
		);

	public async run( interaction: CommandInteraction ): Promise<boolean> {
		const tickets = interaction.options.getString( 'ticket-id' ).split( /\s+/ig );

		const ticketRegex = new RegExp( `\\s*((?:${ BotConfig.projects.join( '|' ) })-\\d+)\\s*` );

		for ( const ticket of tickets ) {
			if ( !ticketRegex.test( ticket ) ) {
				try {
					await interaction.reply( { content: `'${ ticket }' is not a valid ticket ID.`, ephemeral: true } );
				} catch ( err ) {
					Command.logger.log( err );
					return false;
				}
				return true;
			}
		}

		const mention = MentionRegistry.getMention( tickets );

		let embed: MessageEmbed;
		try {
			embed = await mention.getEmbed();
		} catch ( err ) {
			try {
				await interaction.reply( { content: err, ephemeral: true } );
			} catch ( err ) {
				Command.logger.log( err );
				return false;
			}
			return true;
		}

		if ( embed === undefined ) return false;

		embed.setFooter( { text: interaction.user.tag, iconURL: interaction.user.avatarURL() } )
			.setTimestamp( interaction.createdAt );

		try {
			await interaction.reply( { embeds: [embed], ephemeral: true } );
		} catch ( err ) {
			Command.logger.error( err );
			return false;
		}

		return true;
	}
}
