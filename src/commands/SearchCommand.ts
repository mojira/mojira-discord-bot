import { Message, MessageEmbed } from 'discord.js';
import PrefixCommand from './PrefixCommand';
import BotConfig from '../BotConfig';
import MojiraBot from '../MojiraBot';
import { MarkdownUtil } from '../util/MarkdownUtil';

export default class SearchCommand extends PrefixCommand {
	public readonly aliases = ['search', 'find'];

	public async run( message: Message, args: string ): Promise<boolean> {
		if ( !args.length ) {
			return false;
		}

		const plainArgs = args.replace( /\"|\<|\>/g, '' );

		try {
			const embed = new MessageEmbed();
			const searchFilter = `text ~ "${ plainArgs }"`;
			const searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJqlGet( {
				jql: searchFilter,
				maxResults: BotConfig.maxSearchResults,
				fields: [ 'key', 'summary' ],
			} );

			if ( !searchResults.issues ) {
				embed.setTitle( `No results found for ${ MarkdownUtil.escape( plainArgs ) }` );
				await message.channel.send( embed );
				return false;
			}

			embed.setTitle( '**Results:**' );

			for ( const issue of searchResults.issues ) {
				embed.addField( issue.key, `[${ MarkdownUtil.escape( issue.fields.summary ) }](https://bugs.mojang.com/browse/${ issue.key })` );
			}

			const searchLink = `https://bugs.mojang.com/browse/${ searchResults.issues[0].key }?jql=text%20~%20%22${ plainArgs.replace( /\s+/ig, '%20' ) }%22`;

			await message.channel.send( searchLink, { embed } );
		} catch {
			const embed = new MessageEmbed();
			embed.setTitle( `No results found for ${ MarkdownUtil.escape( plainArgs ) }` );
			await message.channel.send( embed );
			return false;
		}

		return true;
	}

	public asString( args: string ): string {
		return `!jira search ${ args }`;
	}
}
