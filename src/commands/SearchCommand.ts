import { EmbedBuilder, escapeMarkdown, ChatInputCommandInteraction } from 'discord.js';
import SlashCommand from './commandHandlers/SlashCommand.js';
import BotConfig from '../BotConfig.js';
import MojiraBot from '../MojiraBot.js';

export default class SearchCommand extends SlashCommand {
	public readonly slashCommandBuilder = this.slashCommandBuilder
		.setName( 'search' )
		.setDescription( 'Search for issues in Jira.' )
		.addStringOption( option =>
			option.setName( 'query' )
				.setDescription( 'The query to search for.' )
				.setRequired( true )
		);

	public async run( interaction: ChatInputCommandInteraction ): Promise<boolean> {
		const plainArgs = interaction.options.getString( 'query' )?.replace( /"|<|>/g, '' );

		if ( plainArgs == null ) return false;

		try {
			const embed = new EmbedBuilder();
			const searchFilter = `text ~ "${ plainArgs }" AND project in (${ BotConfig.projects.join( ', ' ) })`;
			const searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJql( {
				jql: searchFilter,
				maxResults: BotConfig.maxSearchResults,
				fields: [ 'key', 'summary' ],
			} );

			if ( !searchResults.issues ) {
				embed.setTitle( `No results found for "${ escapeMarkdown( plainArgs ) }"` );
				await interaction.reply( { embeds: [embed], ephemeral: true } );
				return true;
			}

			embed.setTitle( '**Results:**' );
			embed.setFooter( { text: interaction.user.tag, iconURL: interaction.user.avatarURL() ?? undefined } );

			for ( const issue of searchResults.issues ) {
				embed.addFields( {
					name: issue.key,
					value: `[${ issue.fields.summary }](https://bugs.mojang.com/browse/${ issue.key })`,
				} );
			}

			const escapedJql = encodeURIComponent( searchFilter ).replace( /\(/g, '%28' ).replace( /\)/g, '%29' );
			embed.setDescription( `__[See all results](https://bugs.mojang.com/issues/?jql=${ escapedJql })__` );

			await interaction.reply( { embeds: [embed], ephemeral: true } );
		} catch {
			const embed = new EmbedBuilder();
			embed.setTitle( `No results found for "${ escapeMarkdown( plainArgs ) }"` );
			await interaction.reply( { embeds: [embed], ephemeral: true } );
			return false;
		}

		return true;
	}
}
