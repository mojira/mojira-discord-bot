import { EmojiResolvable, Message, MessageEmbed, TextChannel, User } from 'discord.js';
import BotConfig from '../BotConfig';
import DiscordUtil from '../util/DiscordUtil';
import { RequestsUtil } from '../util/RequestsUtil';
import MessageTask from './MessageTask';
import * as log4js from 'log4js';
import RequestDeleteEventHandler from '../events/request/RequestDeleteEventHandler';

export default class AddProgressMessageTask extends MessageTask {
	private static logger = log4js.getLogger( 'AddProgressMessageTask' );

	private readonly request: Message;

	constructor(  request: Message ) {
		super();
		this.request = request;
	}

	public async run( origin: Message ): Promise<void> {
		// If the message has been deleted, don't do anything
		if ( origin === undefined ) return;

        const comment = origin.content;
        const date = origin.createdAt;

		if ( origin.deletable ) {
			try {
				await origin.delete();
			} catch ( error ) {
				AddProgressMessageTask.logger.error( error );
			}
		}

		if ( comment ) {
            try {
                let embed = this.request.embeds[0];
                embed.addField( date.toDateString(), comment );
                await this.request.edit( embed );
            } catch ( error ) {
                AddProgressMessageTask.logger.error( error );
            }		
        }
	}
}