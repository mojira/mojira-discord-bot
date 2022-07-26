import { Message, Snowflake } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from '../../BotConfig';
import AddProgressMessageTask from '../../tasks/AddProgressMessageTask';
import TaskScheduler from '../../tasks/TaskScheduler';
import DiscordUtil from '../../util/DiscordUtil';
import EventHandler from '../EventHandler';

export default class InternalProgressEventHandler implements EventHandler<'message'> {
	public readonly eventName = 'message';

	private logger = log4js.getLogger( 'InternalProgressEventHandler' );

	private isValidId( id: string ): id is Snowflake {
		return /^[0-9]{18,}$/.test( id );
	}

	// This syntax is used to ensure that `this` refers to the `InternalProgressEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		const messageId = origin.content.split( /\s/ )[0];
		if ( !this.isValidId( messageId ) ) {
			try {
				const error = await origin.channel.send( `${ origin.author.toString() } ${ messageId } is not a valid message ID!` );
				await DiscordUtil.deleteWithDelay( error, BotConfig.request.warningLifetime );
			} catch ( err ) {
				this.logger.error( err );
			}
			return;
		}

		let progressedRequest: Message;

		try {
			progressedRequest = await origin.channel.messages.fetch( messageId );
		} catch ( err ) {
			const error = await origin.channel.send( `${ origin.author.toString() } ${ messageId } could not be found!` );

			await DiscordUtil.deleteWithDelay( error, BotConfig.request.warningLifetime );

			this.logger.error( err );

			return;
		}

		try {
			TaskScheduler.addOneTimeMessageTask(
				origin,
				new AddProgressMessageTask( progressedRequest ),
				BotConfig.request.progressMessageAddDelay || 0
			);
		} catch ( err ) {
			this.logger.error( err );
		}
	};
}
