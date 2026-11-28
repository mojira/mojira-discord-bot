import { Message } from 'discord.js';
import log4js from 'log4js';
import { ModmailUtil } from '../ModmailUtil.js';

export default class ModmailUpdateEventHandler {
	private logger = log4js.getLogger( 'ModmailUpdateEventHandler' );

	public onEvent = async ( origin: Message ): Promise<void> => {
		await ModmailUtil.queue( origin.channel, () => this.update( origin ) );
	};

	private async update( origin: Message ): Promise<void> {
		try {
			const copy = await ModmailUtil.findCopy( origin.client, origin.id );
			if ( copy === undefined ) return;

			if ( !ModmailUtil.canForward( origin ) ) {
				await ModmailUtil.markFailed( origin );
				return;
			}

			await copy.channel.messages.edit( copy.id, { ...ModmailUtil.getPayload( origin ), attachments: [] } );
		} catch ( e ) {
			this.logger.error( e );
			await ModmailUtil.markFailed( origin );
		}
	}
}
