import { Message } from 'discord.js';
import * as log4js from 'log4js';
import MojiraBot from '../../MojiraBot';
import EventHandler from '../EventHandler';

export default class ModmailReplyEventHandler implements EventHandler<'message'> {
	public readonly eventName = 'message';

	private logger = log4js.getLogger( 'ModmailReplyEventHandler' );

	// This syntax is used to ensure that `this` refers to the `ModmailReplyEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		if ( origin.mentions.repliedUser.id != MojiraBot.client.user.id ) return;

		const repliedTo = await origin.fetchReference();

		const repliedUser = repliedTo.mentions.users.first();

		await repliedUser.send( origin.content );
	};
}
