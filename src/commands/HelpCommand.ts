import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import BotConfig from '../BotConfig.js';
import SlashCommand from './commandHandlers/SlashCommand.js';

export default class HelpCommand extends SlashCommand {
	public readonly slashCommandBuilder = this.slashCommandBuilder
		.setName( 'help' )
		.setDescription( 'Sends a help message.' );

	public async run( interaction: ChatInputCommandInteraction ): Promise<boolean> {
		try {
			const embed = new EmbedBuilder();
			embed.setTitle( '<:mojira:821162280905211964> **MojiraBot help** <:mojira:821162280905211964>' )
				.setDescription( `This is a bot that links to a Mojira ticket when its ticket number is mentioned.
					Currently, the following projects are supported: ${ BotConfig.projects.join( ', ' ) }
					To prevent the bot from linking a ticket, preface the ticket number with an exclamation mark.

					This bot is continuously being worked on and this will receive more features in the future.
					It is not possible to invite this bot to other servers yet.
					If you have any issues, feel free to ping <@417403221863301130>.

					(For help with the bug tracker or this Discord server, use \`/tips\`)`.replace( /\t/g, '' ) )
				.addFields( {
					name: 'Bot Commands',
					value: `\`/help\` - Sends this message.
					
					\`/ping\` - Sends a message to check if the bot is running.
					
					\`/search <query>\` - Searches for text and returns the results from the bug tracker.
					
					\`/tips\` - Sends helpful info on how to use the bug tracker and this Discord server.`,
				} )
				.setFooter( { text: interaction.user.tag, iconURL: interaction.user.avatarURL() ?? undefined } );
			await interaction.reply( { embeds: [embed], ephemeral: true } );
		} catch {
			return false;
		}

		return true;
	}
}
