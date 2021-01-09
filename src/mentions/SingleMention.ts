import { MessageEmbed } from 'discord.js';
import JiraClient from 'jira-connector';
import moment from 'moment';
import { MarkdownUtil } from '../util/MarkdownUtil';
import { Mention } from './Mention';

export class SingleMention extends Mention {
	private jira: JiraClient;

	private ticket: string;

	constructor( ticket: string ) {
		super();

		this.ticket = ticket;

		this.jira = new JiraClient( {
			host: 'bugs.mojang.com',
			strictSSL: true,
		} );
	}

	public async getEmbed(): Promise<MessageEmbed> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let ticketResult: any;

		try {
			ticketResult = await this.jira.issue.getIssue( {
				issueId: this.ticket,
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

		if ( !ticketResult.fields ) {
			Mention.logger.error( 'Error: no fields returned by JIRA' );

			throw 'An error occurred while retrieving this ticket: No fields were returned by the JIRA API.';
		}

		let status = ticketResult.fields.status.name;
		let largeStatus = false;
		if ( ticketResult.fields.resolution ) {
			const resolutionDate = moment( ticketResult.fields.resolutiondate ).fromNow();
			status = `Resolved as **${ ticketResult.fields.resolution.name }** ${ resolutionDate }`;

			if ( ticketResult.fields.resolution.id === '3' ) {
				const parents = ticketResult.fields.issuelinks
					.filter( relation => relation.type.id === '10102' && relation.outwardIssue )
					.map( relation => `\n→ **[${ relation.outwardIssue.key }](https://bugs.mojang.com/browse/${ relation.outwardIssue.key })** *(${ relation.outwardIssue.fields.summary })*` );

				status += parents.join( ',' );
				largeStatus = parents.length > 0;
			}
		}

		let description = ticketResult.fields.description || '';

		// unify line breaks
		description = description.replace( /^\s*[\r\n]/gm, '\n' );

		// convert to Discord markdown
		description = MarkdownUtil.jira2md( description );

		// remove first heading
		description = description.replace( /^#.*$/m, '' );

		// remove empty lines
		description = description.replace( /(^|\n)\s*(\n|$)/g, '\n' );

		// remove all sections except for the first
		description = description.replace( /\n#[\s\S]*$/i, '' );

		// only show first two lines
		description = description.split( '\n' ).slice( 0, 2 ).join( '\n' );

		const embed = new MessageEmbed();
		embed.setAuthor( ticketResult.fields.reporter.displayName, ticketResult.fields.reporter.avatarUrls['48x48'], 'https://bugs.mojang.com/secure/ViewProfile.jspa?name=' + encodeURIComponent( ticketResult.fields.reporter.name ) )
			.setTitle( this.ensureLength( `[${ ticketResult.key }] ${ ticketResult.fields.summary }` ) )
			.setDescription( description.substring( 0, 2048 ) )
			.setURL( `https://bugs.mojang.com/browse/${ ticketResult.key }` )
			.addField( 'Status', status, !largeStatus )
			.setColor( 'RED' );

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		function findThumbnail( attachments: any[] ): string {
			const allowedMimes = [
				'image/png', 'image/jpeg',
			];

			attachments.sort( ( a, b ) => {
				return new Date( a.created ).valueOf() - new Date( b.created ).valueOf();
			} );

			for ( const attachment of attachments ) {
				if ( allowedMimes.includes( attachment.mimeType ) ) return attachment.content;
			}

			return undefined;
		}

		// Assigned to, Reported by, Created on, Category, Resolution, Resolved on, Since version, (Latest) affected version, Fixed version(s)

		const thumbnail = findThumbnail( ticketResult.fields.attachment );
		if ( thumbnail !== undefined ) embed.setThumbnail( thumbnail );

		if ( ticketResult.fields.fixVersions && ticketResult.fields.fixVersions.length ) {
			const fixVersions = ticketResult.fields.fixVersions.map( v => v.name );
			embed.addField( 'Fix version' + ( fixVersions.length > 1 ? 's' : '' ), fixVersions.join( ', ' ), true );
		}

		if ( ticketResult.fields.assignee ) {
			embed.addField( 'Assignee', `[${ ticketResult.fields.assignee.displayName }](https://bugs.mojang.com/secure/ViewProfile.jspa?name=${ encodeURIComponent( ticketResult.fields.assignee.name ) })`, true );
		}

		if ( ticketResult.fields.votes.votes ) {
			embed.addField( 'Votes', ticketResult.fields.votes.votes, true );
		}

		if ( ticketResult.fields.comment.total ) {
			embed.addField( 'Comments', ticketResult.fields.comment.total, true );
		}

		const duplicates = ticketResult.fields.issuelinks.filter( relation => relation.type.id === '10102' && relation.inwardIssue );
		if ( duplicates.length ) {
			embed.addField( 'Duplicates', duplicates.length, true );
		}

		if ( ticketResult.fields.creator.key !== ticketResult.fields.reporter.key ) {
			embed.addField( 'Created by', `[${ ticketResult.fields.creator.displayName }](https://bugs.mojang.com/secure/ViewProfile.jspa?name=${ encodeURIComponent( ticketResult.fields.creator.name ) })`, true );
		}

		embed.addField( 'Created', moment( ticketResult.fields.created ).fromNow(), true );

		return embed;
	}
	private ensureLength( input: string ): string {
		if ( input.length > 251 ) {
			return input.substring( 0, 251 ) + '...';
		}
		return input;
	}
}
