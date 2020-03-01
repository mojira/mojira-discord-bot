import { Mention } from './Mention';
import { RichEmbed } from 'discord.js';
import { EmbedConfig, FieldType } from '../MentionConfig';
import moment = require( 'moment' );
import { SingleMention } from './SingleMention';

export class CustomMention extends SingleMention {
	private config: EmbedConfig;

	constructor( ticket: string, config: EmbedConfig ) {
		super( ticket );
		this.config = config;
	}

	public async getEmbed(): Promise<RichEmbed> {
		let ticketResult;

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

		const embed = new RichEmbed();
		if ( this.config.title ) embed.setTitle( `[${ ticketResult.key }] ${ ticketResult.fields.summary }` );
		if ( this.config.author ) embed.setAuthor( ticketResult.fields.reporter.displayName, ticketResult.fields.reporter.avatarUrls['48x48'], 'https://bugs.mojang.com/secure/ViewProfile.jspa?name=' + encodeURIComponent( ticketResult.fields.reporter.name ) );
		if ( this.config.url ) embed.setURL( `https://bugs.mojang.com/browse/${ ticketResult.key }` );
		if ( this.config.thumbnail ) embed.setImage( this.findThumbnail( ticketResult.fields.attachment ) );

		if ( this.config.description ) {
			let description = ticketResult.fields.description || '';
			description = description.replace( /^\s*[\r\n]/gm, '\n' );

			if ( typeof this.config.description === 'object' ) {
				if ( this.config.description !== undefined ) {
					for ( const regex of this.config.description.exclude ) {
						description = description.replace( regex, '' );
					}
				}

				if ( this.config.description.maxLineBreaks !== undefined ) description = description.split( '\n' ).slice( 0, this.config.description.maxLineBreaks ).join( '\n' );
				if ( this.config.description.maxCharacters !== undefined ) description = description.substring( 0, this.config.description.maxCharacters );
			}

			embed.setDescription( description );
		}

		embed.setColor( this.config.color );

		if ( this.config.fields ) {
			for ( const field of this.config.fields ) {
				switch ( +field.type ) {
					case FieldType.Status: {
						let status = ticketResult.fields.status.name;
						if ( ticketResult.fields.resolution ) status = `Resolved (${ ticketResult.fields.resolution.name })`;
						embed.addField( field.label, status, field.inline );
						break;
					}

					case FieldType.LargeStatus: {
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

						if( status ) embed.addField( field.label, status, field.inline && !largeStatus );
						break;
					}

					case FieldType.Field: {
						const value = this.resolvePath( ticketResult.fields, field.path );
						if ( value ) embed.addField( field.label, value, field.inline );
						break;
					}

					case FieldType.User: {
						const user = this.resolvePath( ticketResult.fields, field.path );
						if( user ) embed.addField( field.label, `[${ user.displayName }](https://bugs.mojang.com/secure/ViewProfile.jspa?name=${ encodeURIComponent( user.name ) })`, field.inline );
						break;
					}

					case FieldType.JoinedArray: {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						let array = this.resolvePath( ticketResult.fields, field.path ) as Array<any>;
						if( array ) {
							if ( field.innerPath ) {
								array = array.map( v => this.resolvePath( v, field.innerPath ) );
							}
							if( array !== undefined && array.length > 0 ) embed.addField( field.label, array.join( ', ' ), field.inline );
						}

						break;
					}

					case FieldType.ArrayCount: {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						let array = this.resolvePath( ticketResult.fields, field.path ) as Array<any>;
						if( array ) {
							if ( field.innerPath ) {
								array = array.map( v => this.resolvePath( v, field.innerPath ) );
							}
							if( array ) embed.addField( field.label, array.length, field.inline );
						}

						break;
					}

					case FieldType.DuplicateCount: {
						const duplicates = ticketResult.fields.issuelinks.filter( relation => relation.type.id === '10102' && relation.inwardIssue );
						if ( duplicates.length ) embed.addField( field.label, duplicates.length, field.inline );
						break;
					}

					case FieldType.Date: {
						const date = this.resolvePath( ticketResult.fields, field.path ) as string;
						if ( date ) embed.addField( field.label, new Date( date ).toDateString(), field.inline );
						break;
					}

					case FieldType.FromNow: {
						const date = this.resolvePath( ticketResult.fields, field.path ) as string;
						if ( date ) embed.addField( field.label, moment( date ).fromNow(), field.inline );

						break;
					}
				}
			}
		}
		return embed;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	private resolvePath( fields, path: string ) {
		let cur = fields;
		for ( const entry of path.split( '.' ) ) {
			cur = cur[ entry ];
		}

		return cur;
	}

	public getTicket(): string {
		return this.ticket;
	}
}