import { RichEmbed } from 'discord.js';
import { Mention } from './Mention';
import MojiraBot from '../MojiraBot';

export class MultipleMention extends Mention {
	private tickets: string[];

	constructor( tickets: string[] ) {
		super();

		this.tickets = tickets;
	}

	public async getEmbed(): Promise<RichEmbed> {
		const embed = new RichEmbed();
		embed.setTitle( 'Mentioned tickets' )
			.setColor( 'RED' );

		let searchResults: any;

		try {
			searchResults = await MojiraBot.jira.issueSearch.searchForIssuesUsingJqlGet( {
				jql: `id IN (${ this.tickets.join( ',' ) }) ORDER BY key ASC`,
				maxResults: 10,
				fields: [ 'key', 'summary' ],
			} );
		} catch ( err ) {
			let ticketList = this.tickets.join( ', ' );
			const lastSeparatorPos = ticketList.lastIndexOf( ', ' );
			ticketList = `${ ticketList.substring( 0, lastSeparatorPos ) } and ${ ticketList.substring( lastSeparatorPos + 2, ticketList.length ) }`;

			let errorMessage = `An error occurred while retrieving tickets ${ ticketList }: ${ err.message }`;

			if ( err.response?.data?.errorMessages ) {
				for ( const msg of err.response.data.errorMessages ) {
					errorMessage += `\n${ msg }`;
				}
			}

			throw new Error( errorMessage );
		}

		if ( !searchResults.issues ) {
			throw new Error( 'No issues were returned by the JIRA API.' );
		}

		for ( const issue of searchResults.issues ) {
			embed.addField( issue.key, `[${ issue.fields.summary }](https://bugs.mojang.com/browse/${ issue.key })` );
		}

		if ( this.tickets.length !== searchResults.issues.length ) {
			embed.addField(
				'More results',
				`[View all ${ this.tickets.length } tickets](https://bugs.mojang.com/issues/?jql=` + `id IN %28${ this.tickets.join( ',' ) }%29 ORDER BY key ASC`.replace( /\s+/ig, '%20' ) + ')'
			);
		}

		return embed;
	}
}