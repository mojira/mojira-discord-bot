import { Message } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from '../../BotConfig';
import AddProgressMessageTask from '../../tasks/AddProgressMessageTask';
import TaskScheduler from '../../tasks/TaskScheduler';
import EventHandler from '../EventHandler';

export default class InternalProgressEventHandler implements EventHandler<'message'> {
	public readonly eventName = 'message';

	private logger = log4js.getLogger( 'InternalProgressEventHandler' );

	// This syntax is used to ensure that `this` refers to the `InternalProgressEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		const messageId = origin.content.split( /\s/ )[0];
		if ( !messageId.match( /[0-9]{18}/ ) ) {
			try {
				const error = await origin.channel.send( `${ origin.author.toString() } ${ messageId } is not a valid message ID!` );
				
				const timeout = BotConfig.request.warningLifetime;
				
				await error.delete( { timeout } );
			} catch ( err ) {
				this.logger.error( err );
			}
			return;
		}

		let progressedRequest;

		try {
			progressedRequest = (await origin.channel.messages.fetch( messageId ));
		} catch ( err ) {
			const error = await origin.channel.send( `${ origin.author.toString() } ${ messageId } could not be found!` );
				
			const timeout = BotConfig.request.warningLifetime;
			
			await error.delete( { timeout } );
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
