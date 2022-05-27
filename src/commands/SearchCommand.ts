import { Message, MessageEmbed } from 'discord.js';
import PrefixCommand from './PrefixCommand';
import BotConfig from '../BotConfig';
import MojiraBot from '../MojiraBot';

export default class SearchCommand extends PrefixCommand {
	public readonly aliases = ['search', 'find'];

	public async run( message: Message, args: string ): Promise<boolean> {
		if ( !args.length ) {
			return false;
		}

		const plainArgs = args.replace( /[<>!]/g, '' );
		let searchFilter: string;
		if ( plainArgs.includes( ':jql' ) ) {
			searchFilter = plainArgs.split( ':jql' ).slice( 1 ).join( ' ' ).trim();
		} else {
			const modifierRegex = new RegExp( /(^|\s)(_|-)[a-z]+\s(([a-zA-Z0-9_]+)|(["'][^"']+["']))/, 'g' );
			const modifiers = plainArgs.match( modifierRegex );
			const textArgs = plainArgs.replace( modifierRegex, '' ).trim();
			const modifierStrings = [];

			if ( modifiers ) {
				for ( const spacedModifier of modifiers ) {
					const modifier = spacedModifier.trim();
					const operation = modifier.charAt( 0 );
					let field = modifier.split( /\s/g )[0].substring( 1 );
					const value = modifier.split( /\s/g ).slice( 1 ).join( ' ' );

					BotConfig.fieldShortcuts.forEach( ( replaced: string, original: string ) => {
						const fieldRegex = new RegExp( original, 'g' );
						const quoteChar = replaced.split( /\s/g ).length > 1 ? '"' : '';
						const quotedReplaced = `${ quoteChar }${ replaced }${ quoteChar }`;
						field = field.replace( fieldRegex, quotedReplaced );
					} );

					let forcedPush = '';
					BotConfig.prebuiltClauses.forEach( ( fun: string, original: string ) => {
						if ( field == original ) {
							const quotedReplaced = value.replace( /["]/g, '\\$&' );
							const filledFunction = fun
								.replace( /\$\?/g, quotedReplaced )
								.replace( /\$!/g, value );
							forcedPush = filledFunction;
						}
					} );

					if ( forcedPush.length > 0 ) {
						if ( operation == '-' ) forcedPush = `NOT (${ forcedPush })`;
						modifierStrings.push( forcedPush );
						continue;
					}

					let clause: string;
					if ( value.toUpperCase() == 'EMPTY' ) {
						clause = `${ field } is ${ operation == '-' ? 'NOT ' : '' }EMPTY`;
					} else {
						clause = `${ field } ${ operation == '-' ? '!' : '' }${ BotConfig.containsSearchSyntax.includes( field ) ? '~' : '=' } ${ value }`;
					}

					modifierStrings.push( clause );
				}
			} else {
				modifierStrings.push( `text ~ "${ textArgs }"` );
			}

			searchFilter = modifierStrings.join( ' AND ' );

			if ( !searchFilter.toLowerCase().includes( 'text ~ ' ) && textArgs.length > 0 ) {
				searchFilter += ` AND text ~ "${ textArgs.replace( /["']/g, '\\&' ) }"`;
			}
			if ( !searchFilter.toUpperCase().includes( ' ORDER BY ' ) ) {
				searchFilter += ' ORDER BY created, updated DESC';
			}
		}


		try {
			const embed = new MessageEmbed()
				.setColor( 'BLUE' );

			const searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJql( {
				jql: searchFilter,
				maxResults: BotConfig.maxSearchResults,
				fields: [ 'key', 'summary' ],
			} );

			if ( searchFilter.length > 0 ) {
				embed.addField( 'JQL query', `\`\`\`${ searchFilter.replace( /```/g, '` ` `' ) }\`\`\``, false );
			}

			if ( !searchResults.issues || searchResults.issues.length == 0 ) {
				embed.setTitle( 'No results found' );
				await message.channel.send( { embeds: [embed] } );
				return false;
			}

			embed.setTitle( `${ searchResults.total } result${ searchResults.total != 1 ? 's' : '' }` );
			embed.setFooter( { text: message.author.tag, iconURL: message.author.avatarURL() } );

			for ( const issue of searchResults.issues ) {
				embed.addField( issue.key, `[${ issue.fields.summary }](https://bugs.mojang.com/browse/${ issue.key })` );
			}

			const escapedJql = encodeURIComponent( searchFilter ).replace( /\(/g, '%28' ).replace( /\)/g, '%29' );
			embed.setDescription( `[See all results](https://bugs.mojang.com/issues/?jql=${ escapedJql })` );

			await message.channel.send( { embeds: [embed] } );
		} catch {
			const embed = new MessageEmbed()
				.setTitle( 'Failed to search issues' )
				.setColor( 'RED' )
				.addField( 'JQL query', `\`\`\`${ searchFilter.replace( /```/g, '` ` `' ) }\`\`\`` );
			await message.channel.send( { embeds: [embed] } );
			return false;
		}

		return true;
	}

	public asString( args: string ): string {
		return `!jira search ${ args }`;
	}
}
