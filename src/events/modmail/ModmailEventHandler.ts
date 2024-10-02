import { Message, TextChannel } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../../BotConfig.js';
import DiscordUtil from '../../util/DiscordUtil.js';
import EventHandler from '../EventHandler.js';

export default class ModmailEventHandler implements EventHandler<'messageCreate'> {
	public readonly eventName = 'messageCreate';

	private logger = log4js.getLogger( 'ModmailEventHandler' );

	// This syntax is used to ensure that `this` refers to the `ModmailEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		if ( !origin.channel.isSendable() ) {
			return;
		}

		const modmailChannel = await DiscordUtil.getChannel( BotConfig.modmailChannel );

		const banStatus = BotConfig.database.prepare( 'SELECT user FROM modmail_bans WHERE user = ?' ).get( origin.author.id );

		const previousThread = BotConfig.database.prepare( 'SELECT thread FROM modmail_threads WHERE user = ?' ).get( origin.author.id );

		if ( modmailChannel instanceof TextChannel && banStatus === undefined ) {
			if ( previousThread ) {
				const thread = modmailChannel.threads.cache.find( t => t.id == previousThread.thread );
				if ( thread && !thread.archived ) {
					try {
						await thread.send( `${ origin.author }: ${ origin.content }` );
						if ( origin.attachments ) {
							origin.attachments.forEach( async file => {
								await thread.send( {
									files: [ {
										attachment: file.url,
										name: file.name ?? undefined,
									} ],
								} );
							} );
						}
						await origin.react( '📬' );
						return;
					} catch ( e ) {
						this.logger.error( e );

						return;
					}
				} else {
					await BotConfig.database.prepare(
						`DELETE FROM modmail_threads
						WHERE user = ?`
					).run( origin.author.id );
				}
			}
			try {
				const start = await modmailChannel.send( `${ origin.author }: ${ origin.content }` );
				await origin.react( '📬' );

				const newThread = await start.startThread( {
					name: origin.author.tag,
					autoArchiveDuration: 1440,
				} );

				BotConfig.database.prepare(
					`INSERT INTO modmail_threads (user, thread)
					VALUES (?, ?)`
				).run( [ origin.author.id, newThread.id ] );

				if ( origin.attachments ) {
					origin.attachments.forEach( async file => {
						await newThread.send( {
							files: [ {
								attachment: file.url,
								name: file.name ?? undefined,
							} ],
						} );
					} );
				}
			} catch ( e ) {
				this.logger.error( e );

				return;
			}
		} else if ( banStatus !== undefined ) {
			try {
				await origin.channel.send( 'We\'re sorry, but you have been banned from sending any further modmail messages.' );
				await origin.react( '❌' );
			} catch ( e ) {
				this.logger.error( e );

				return;
			}
		}
	};
}
