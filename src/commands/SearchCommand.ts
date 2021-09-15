import { Message, MessageEmbed, Util } from 'discord.js';
import PrefixCommand from './PrefixCommand';
import BotConfig from '../BotConfig';
import MojiraBot from '../MojiraBot';

export default class SearchCommand extends PrefixCommand {
	public readonly aliases = ['search', 'find'];

	public async run( message: Message, args: string ): Promise<boolean> {
		if ( !args.length ) {
			return false;
		}

		const plainArgs = args.replace( /"|<|>/g, '' );

		try {
			const embed = new MessageEmbed();
			const searchFilter = `text ~ "${ plainArgs }" AND project in (${ BotConfig.projects.join( ', ' ) })`;
			const searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJqlGet( {
				jql: searchFilter,
				maxResults: BotConfig.maxSearchResults,
				fields: [ 'key', 'summary' ],
			} );

			if ( !searchResults.issues ) {
				embed.setTitle( `No results found for "${ Util.escapeMarkdown( plainArgs ) }"` );
				await message.channel.send( embed );
				return false;
			}

			embed.setTitle( '**Results:**' );
			embed.setFooter( message.author.tag, message.author.avatarURL() );

			for ( const issue of searchResults.issues ) {
				embed.addField( issue.key, `[${ issue.fields.summary }](https://bugs.mojang.com/browse/${ issue.key })` );
			}

			const escapedJql = encodeURIComponent( searchFilter ).replace( '/(/g', '%28' ).replace( '/)/g', '%29' );
			embed.setDescription( `__[See all results](https://bugs.mojang.com/issues/?jql=${ escapedJql })__` );

			await message.channel.send( embed );
		} catch {
			const embed = new MessageEmbed();
			embed.setTitle( `No results found for "${ Util.escapeMarkdown( plainArgs ) }"` );
			await message.channel.send( embed );
			return false;
		}

		return true;
	}

	public asString( args: string ): string {
		return `!jira search ${ args }`;
	}
}
