import { RichEmbed } from 'discord.js';
import Mention from './Mention';
import JiraClient = require( 'jira-connector' );
import BotConfig from '../BotConfig';

export default class MultipleMention extends Mention {
	private jira: JiraClient;

	private tickets: string[];
	private maxGroupedMentions: number;

	constructor( tickets: string[], maxGroupedMentions?: number ) {
		super();

		this.tickets = tickets;
		this.maxGroupedMentions = maxGroupedMentions || BotConfig.maxGroupedMentions;

		this.jira = new JiraClient( {
			host: 'bugs.mojang.com',
			strictSSL: true,
		} );
	}

	public async getEmbed(): Promise<RichEmbed> {
		const embed = new RichEmbed();
		embed.setTitle( 'Mentioned tickets' )
			.setColor( 'RED' );

		let searchResults;

		try {
			searchResults = await this.jira.search.search( {
				jql: `id IN (${ this.tickets.join( ',' ) }) ORDER BY key ASC`,
				maxResults: this.maxGroupedMentions,
				fields: [ 'key', 'summary' ],
			} );
		} catch ( err ) {
			const exception = JSON.parse( err );
			if ( !exception ) {
				Mention.logger.error( err );
				return;
			}

			Mention.logger.error( 'Error: status code ' + exception.statusCode );

			// TODO clean up
			let errorMessage = `An error occurred while retrieving this ticket: ${ exception.body.errorMessages[0] }`;

			if ( exception.statusCode === 404 ) {
				errorMessage = 'This ticket doesn\'t seem to exist.';
			} else if ( exception.statusCode === 401 ) {
				errorMessage = 'This ticket is private or has been deleted.';
			}

			throw errorMessage;
		}

		if ( !searchResults.issues ) {
			Mention.logger.error( 'Error: no issues returned by JIRA' );

			throw 'An error occurred while retrieving this ticket: No issues were returned by the JIRA API.';
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let description = '';
		let shortened = false;
		for ( const issue of searchResults.issues ) {
			const value = `${ description ? '\n' : '' }\`${ issue.key }\` - [${ issue.fields.summary }](https://bugs.mojang.com/browse/${ issue.key })`;

			// Max length defined by Discord api
			if ( description.length + value.length > 2048 ) {
				shortened = true;
				break;
			}
			description += value;
		}

		embed.setDescription( description );

		if ( shortened || this.tickets.length !== searchResults.issues.length ) {
			embed.addField(
				'More results',
				`[View all ${ this.tickets.length } tickets](https://bugs.mojang.com/issues/?jql=` + `id IN %28${ this.tickets.join( ',' ) }%29 ORDER BY key ASC`.replace( /\s+/ig, '%20' ) + ')'
			);
		}

		return embed;
	}

	public getTicket(): string {
		return this.tickets.join( ', ' );
	}
}