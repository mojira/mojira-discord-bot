import { Message } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../../BotConfig.js';
import EventHandler from '../EventHandler.js';

export default class ModmailThreadEventHandler implements EventHandler<'messageCreate'> {
	public readonly eventName = 'messageCreate';

	private logger = log4js.getLogger( 'ModmailThreadEventHandler' );

	// This syntax is used to ensure that `this` refers to the `ModmailThreadEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		const id = BotConfig.database.prepare( 'SELECT user FROM modmail_threads WHERE thread = ?' ).get( origin.channel.id );

		if ( !origin.channel.isThread() || id === undefined ) return;

		const user = await origin.channel.fetchStarterMessage().then( msg => msg?.mentions.users.first() );

		if ( user ) {
			try {
				if ( origin.content ) {
					await user.send( origin.content );
				}

				if ( origin.attachments ) {
					origin.attachments.forEach( async file => {
						await user.send( {
							files: [ {
								attachment: file.url,
								name: file.name ?? undefined,
							} ],
						} );
					} );
				}
			} catch ( err ) {
				this.logger.error( err );

				return;
			}
		}
		return;
	};
}
