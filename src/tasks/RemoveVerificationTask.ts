import { Message } from 'discord.js';
import MessageTask from './MessageTask';
import * as log4js from 'log4js';

export default class RemoveVerificationTask extends MessageTask {
	private static logger = log4js.getLogger( 'RemoveVerificationTask' );

	public async run( message: Message ): Promise<void> {
		if ( message === undefined || message.deleted ) return;

		if ( message.deletable ) {
			try {
				await message.delete();
				RemoveVerificationTask.logger.info( `Removed verification link '${ message.id }'` );
			} catch ( error ) {
				RemoveVerificationTask.logger.error( error );
			}
		}
	}
}