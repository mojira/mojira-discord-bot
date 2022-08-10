import { Message } from 'discord.js';
import * as log4js from 'log4js';

export class ReactionsUtil {
	private static logger = log4js.getLogger( 'ReactionsUtil' );

	public static async reactToMessage( message: Message, reactions: string[] ): Promise<void> {
		if ( !reactions.length || message === undefined ) return;

		const reaction = reactions.shift();
		if ( reaction === undefined ) return;

		this.logger.debug( `Reacting to message ${ message.id } with ${ reaction }` );

		try {
			await message.react( reaction );
			this.logger.debug( `Reacted to message ${ message.id } with ${ reaction }` );
		} catch ( err ) {
			this.logger.error( err );
		}

		await this.reactToMessage( message, reactions );
	}
}
