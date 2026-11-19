import { Message, ThreadChannel } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../../BotConfig.js';
import { ModmailUtil } from '../../util/ModmailUtil.js';

export default class ModmailUpdateEventHandler {
	private logger = log4js.getLogger( 'ModmailUpdateEventHandler' );

	// This syntax is used to ensure that `this` refers to the `ModmailUpdateEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		const stored = BotConfig.database.prepare(
			`SELECT t.user, m.thread, m.dm_message, m.thread_message FROM modmail_messages m
			JOIN modmail_threads t ON t.thread = m.thread
			WHERE m.sender != 'comment' AND ( m.dm_message = ? OR m.thread_message = ? )`
		).get( origin.id, origin.id ) as { user: string; thread: string; dm_message: string; thread_message: string } | undefined;

		if ( stored === undefined ) return;

		if ( !ModmailUtil.canForward( origin ) ) {
			await ModmailUtil.markFailed( origin );
			return;
		}

		try {
			const [ channel, copyId ] = origin.channel.isDMBased()
				? [ await origin.client.channels.fetch( stored.thread ) as ThreadChannel, stored.thread_message ]
				: [ await ( await origin.client.users.fetch( stored.user ) ).createDM(), stored.dm_message ];

			await channel.messages.edit( copyId, {
				content: origin.content,
				attachments: [],
				files: origin.attachments.map( file => ( {
					attachment: file.url,
					name: file.name ?? undefined,
				} ) ),
				allowedMentions: { parse: [] },
			} );
		} catch ( e ) {
			this.logger.error( e );
			await ModmailUtil.markFailed( origin );
		}
	};
}
