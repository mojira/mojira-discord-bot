import { Message } from 'discord.js';
import log4js from 'log4js';

export class ReactionsUtil {
	private static logger = log4js.getLogger( 'ReactionsUtil' );

	public static async reactToMessage( message: Message, reactions: string[] ): Promise<void> {
		if ( !reactions.length || message === undefined ) return;

		const reaction = reactions.shift();
		if ( reaction === undefined ) return;

		try {
			await message.react( reaction );
		} catch ( err ) {
			this.logger.warn( `Error while reacting to message ${ message.id }`, err );
		}

		await this.reactToMessage( message, reactions );
	}
}
