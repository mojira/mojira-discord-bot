import { Message } from 'discord.js';
import * as log4js from 'log4js';

export class ReactionsUtil {
	private static logger = log4js.getLogger( 'ReactionsUtil' );

	public static async reactToMessage( message: Message, reactions: string[] ): Promise<void> {
		if ( !reactions.length ) return;

		try {
			await message.react( reactions.shift() );
		} catch ( err ) {
			this.logger.error( err );
		}
		this.reactToMessage( message, reactions );
	}
}