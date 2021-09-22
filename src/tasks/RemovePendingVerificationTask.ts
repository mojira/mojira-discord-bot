import { Message } from 'discord.js';
import MessageTask from './MessageTask';
import * as log4js from 'log4js';
import DiscordUtil from '../util/DiscordUtil';

export default class RemovePendingVerificationTask extends MessageTask {
	private static logger = log4js.getLogger( 'RemovePendingVerificationTask' );

	public async run( message: Message ): Promise<void> {
		// If the message is undefined or has been deleted, don't do anything
		if ( message === undefined || message.deleted ) return;

		const user = await DiscordUtil.getMember( message.guild, message.embeds[0].fields[0].value.replace( /[<>@!]/g, '' ) );

		if ( message.deletable ) {
			try {
				await message.delete();
				await ( await user ).send( 'Your verification token has expired! Send `!jira verify` again to obtain a new token.' );
				RemovePendingVerificationTask.logger.info( `Cleared pending verification by user ${ ( await user ).user.tag }` );
			} catch ( error ) {
				RemovePendingVerificationTask.logger.error( error );
			}
		}
	}
}
