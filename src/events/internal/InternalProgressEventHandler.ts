import { Message, Snowflake } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../../BotConfig.js';
import AddProgressMessageTask from '../../tasks/AddProgressMessageTask.js';
import TaskScheduler from '../../tasks/TaskScheduler.js';
import DiscordUtil from '../../util/DiscordUtil.js';
import EventHandler from '../EventHandler.js';

export default class InternalProgressEventHandler implements EventHandler<'messageCreate'> {
	public readonly eventName = 'messageCreate';

	private logger = log4js.getLogger( 'InternalProgressEventHandler' );

	private isValidId( id: string ): id is Snowflake {
		return !!id.match( /[0-9]{18}/ );
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
