import { CommandInteraction, MessageEmbed, Util } from 'discord.js';
import BotConfig from '../BotConfig';
import MojiraBot from '../MojiraBot';
import SlashCommand from './commandHandlers/SlashCommand';

export default class SearchCommand extends SlashCommand {
	public readonly slashCommandBuilder = this.slashCommandBuilder
		.setName( 'search' )
		.setDescription( 'Search for issues in Jira.' )
		.addStringOption( option =>
			option.setName( 'query' )
				.setDescription( 'The query to search for.' )
				.setRequired( true )
		);

	public async run( interaction: CommandInteraction ): Promise<boolean> {
		const plainArgs = interaction.options.getString( 'query' ).replace( /"|<|>/g, '' );

		try {
			const embed = new MessageEmbed();
			const searchFilter = `text ~ "${ plainArgs }" AND project in (${ BotConfig.projects.join( ', ' ) })`;
			const searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJql( {
				jql: searchFilter,
				maxResults: BotConfig.maxSearchResults,
				fields: [ 'key', 'summary' ],
			} );

			if ( !searchResults.issues ) {
				embed.setTitle( `No results found for "${ Util.escapeMarkdown( plainArgs ) }"` );
				await interaction.reply( { embeds: [embed], ephemeral: true } );
				return true;
			}

			embed.setTitle( '**Results:**' );
			embed.setFooter( { text: interaction.user.tag, iconURL: interaction.user.avatarURL() } );

			for ( const issue of searchResults.issues ) {
				embed.addField( issue.key, `[${ issue.fields.summary }](https://bugs.mojang.com/browse/${ issue.key })` );
			}

			const escapedJql = encodeURIComponent( searchFilter ).replace( /\(/g, '%28' ).replace( /\)/g, '%29' );
			embed.setDescription( `__[See all results](https://bugs.mojang.com/issues/?jql=${ escapedJql })__` );

			await interaction.reply( { embeds: [embed], ephemeral: true } );
		} catch {
			const embed = new MessageEmbed();
			embed.setTitle( `No results found for "${ Util.escapeMarkdown( plainArgs ) }"` );
			await interaction.reply( { embeds: [embed], ephemeral: true } );
			return true;
		}

		return true;
	}
}
