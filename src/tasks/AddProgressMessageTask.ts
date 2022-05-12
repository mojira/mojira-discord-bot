import { Message } from 'discord.js';
import MessageTask from './MessageTask';
import * as log4js from 'log4js';

export default class AddProgressMessageTask extends MessageTask {
	private static logger = log4js.getLogger( 'AddProgressMessageTask' );

	private readonly request: Message;

	constructor( request: Message ) {
		super();
		this.request = request;
	}

	public async run( origin: Message ): Promise<void> {
		// If the message is undefined or has been deleted, don't do anything
		if ( origin === undefined || origin.deleted ) return;

		const comment = origin.content;
		const date = origin.createdAt;
		const user = origin.author;

		if ( origin.deletable ) {
			try {
				await origin.delete();
			} catch ( error ) {
				AddProgressMessageTask.logger.error( error );
			}
		}

		if ( comment ) {
			try {
				const embed = this.request.embeds[0];
				embed.addField( date.toDateString(), `${ user } - ${ comment.replace( `${ this.request.id } `, '' ).replace( `${ this.request.id }\n`, '' ) }` );
				await this.request.edit( { embeds: [embed] } );
			} catch ( error ) {
				AddProgressMessageTask.logger.error( error );
			}
		}
	}
}
