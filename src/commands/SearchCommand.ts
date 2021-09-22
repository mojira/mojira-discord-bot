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

		const plainArgs = args.replace( /<|>/g, '' );
		const modifierRegex = new RegExp( /_[a-z]+\s(([a-zA-Z0-9]+)|(["'][^"']+["']))|:query/, 'g' );
		const modifiers = plainArgs.match( modifierRegex );
		const textArgs = plainArgs.replace( modifierRegex, '' ).trim();

		try {
			const embed = new MessageEmbed();
			let searchFilter = `project in (${ BotConfig.projects.join( ', ' ) })`;

			if ( modifiers ) {
				for ( const modifier of modifiers ) {
					if ( modifier == ':query' ) {
						searchFilter = textArgs;
						break;
					}
					if ( [ 'project', 'creator', 'reporter', 'assignee', 'version', 'resolution', 'status', 'fixversion', 'confirmation', 'gamemode', 'id', 'labels', 'key', 'priority', 'mp' ].includes( modifier.split( /_|\s/g )[1] ) ) searchFilter += ` AND ${ modifier.split( /_|\s/g )[1].toLowerCase().replace( 'confirmation', '"Confirmation Status"' ).replace( 'gamemode', '"Game Mode"' ).replace( 'mp', '"Mojang Priority"' ) } = ${ modifier.split( /\s/g ).slice( 1 ).join( ' ' ) }`;
					if ( [ 'comment', 'summary', 'description', 'environment' ].includes( modifier.split( /_|\s/g )[1] ) ) searchFilter += ` AND ${ modifier.split( /_|\s/g )[1].toLowerCase() } ~ ${ modifier.split( /\s/g ).slice( 1 ).join( ' ' ) }`;
				}
			}
			if ( textArgs && !modifiers.includes( ':query' ) ) searchFilter += ` AND text ~ "${ textArgs }"`;

			const searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJqlGet( {
				jql: searchFilter,
				maxResults: BotConfig.maxSearchResults,
				fields: [ 'key', 'summary' ],
			} );

			if ( !searchResults.issues ) {
				embed.setTitle( `No results found for "${ Util.escapeMarkdown( textArgs ) }"` );
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
			embed.setTitle( `No results found for "${ Util.escapeMarkdown( textArgs ) }"` );
			await message.channel.send( embed );
			return false;
		}

		return true;
	}

	public asString( args: string ): string {
		return `!jira search ${ args }`;
	}
}