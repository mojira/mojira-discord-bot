import { Message } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../../BotConfig.js';
import EventHandler from '../EventHandler.js';

export default class ModmailThreadEventHandler implements EventHandler<'messageCreate'> {
	public readonly eventName = 'messageCreate';

	private logger = log4js.getLogger( 'ModmailThreadEventHandler' );

	// This syntax is used to ensure that `this` refers to the `ModmailThreadEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		const id = BotConfig.database.prepare( 'SELECT user FROM modmail_threads WHERE thread = ?' ).get( origin.channel.id ) as { user: string } | undefined;

		if ( !origin.channel.isThread() || id === undefined ) return;

		try {
			const user = await origin.client.users.fetch( id.user );
			const replyTo = BotConfig.database.prepare( 'SELECT dm FROM modmail_messages WHERE thread = ?' ).get( origin.reference?.messageId ?? '' ) as { dm: string } | undefined;

			const dm = await user.send( {
				content: origin.content,
				files: origin.attachments.map( file => ( {
					attachment: file.url,
					name: file.name ?? undefined,
				} ) ),
				reply: replyTo && { messageReference: replyTo.dm, failIfNotExists: false },
			} );

			BotConfig.database.prepare(
				`INSERT INTO modmail_messages (dm, thread)
				VALUES (?, ?)`
			).run( [ dm.id, origin.id ] );

			await origin.react( '📬' );
		} catch ( err ) {
			this.logger.error( err );

			try {
				await origin.react( '❌' );
			} catch ( reactErr ) {
				this.logger.error( reactErr );
			}

			return;
		}
		return;
	};
}
