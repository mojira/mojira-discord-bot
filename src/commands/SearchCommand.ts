import { EmbedBuilder, escapeMarkdown, Message } from 'discord.js';
import PrefixCommand from './PrefixCommand.js';
import BotConfig from '../BotConfig.js';
import MojiraBot from '../MojiraBot.js';

export default class SearchCommand extends PrefixCommand {
	public readonly aliases = ['search', 'find'];

	public async run( message: Message, args: string ): Promise<boolean> {
		if ( !args.length ) {
			return false;
		}

		const plainArgs = args.replace( /"|<|>/g, '' );

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
				await message.channel.send( { embeds: [embed] } );
				return false;
			}

			embed.setTitle( '**Results:**' );
			embed.setFooter( { text: message.author.tag, iconURL: message.author.avatarURL() ?? undefined } );

			for ( const issue of searchResults.issues ) {
				embed.addFields( {
					name: issue.key,
					value: `[${ issue.fields.summary }](https://bugs.mojang.com/browse/${ issue.key })`,
				} );
			}

			const escapedJql = encodeURIComponent( searchFilter ).replace( /\(/g, '%28' ).replace( /\)/g, '%29' );
			embed.setDescription( `__[See all results](https://bugs.mojang.com/issues/?jql=${ escapedJql })__` );

			await message.channel.send( { embeds: [embed] } );
		} catch {
			const embed = new EmbedBuilder();
			embed.setTitle( `No results found for "${ escapeMarkdown( plainArgs ) }"` );
			await message.channel.send( { embeds: [embed] } );
			return false;
		}

		return true;
	}

	public asString( args: string ): string {
		return `!jira search ${ args }`;
	}
}
