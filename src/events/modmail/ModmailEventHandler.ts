import { ComponentType, ContainerBuilder, Message, MessageFlags, SectionBuilder, Snowflake, TextChannel, TextDisplayBuilder, ThreadChannel, ThumbnailBuilder } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../../BotConfig.js';
import DiscordUtil from '../../util/DiscordUtil.js';
import { ModmailUtil } from '../../util/ModmailUtil.js';
import EventHandler from '../EventHandler.js';

export default class ModmailEventHandler implements EventHandler<'messageCreate'> {
	public readonly eventName = 'messageCreate';

	private logger = log4js.getLogger( 'ModmailEventHandler' );

	private readonly queues = new Map<Snowflake, Promise<void>>();

	// This syntax is used to ensure that `this` refers to the `ModmailEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		const previous = this.queues.get( origin.author.id ) ?? Promise.resolve();
		const current = previous.catch( () => undefined ).then( () => this.handle( origin ) );
		this.queues.set( origin.author.id, current );

		try {
			await current;
		} finally {
			if ( this.queues.get( origin.author.id ) === current ) {
				this.queues.delete( origin.author.id );
			}
		}
	};

	private async handle( origin: Message ): Promise<void> {
		if ( !origin.channel.isSendable() ) {
			return;
		}

		const modmailChannel = await DiscordUtil.getChannel( BotConfig.modmailChannel );

		const banStatus = BotConfig.database.prepare( 'SELECT user FROM modmail_bans WHERE user = ?' ).get( origin.author.id );

		const previousThread = BotConfig.database.prepare( 'SELECT thread FROM modmail_threads WHERE user = ?' ).get( origin.author.id ) as { thread: string };

		if ( modmailChannel instanceof TextChannel && banStatus === undefined ) {
			if ( !ModmailUtil.canForward( origin ) ) {
				await ModmailUtil.markFailed( origin );
				return;
			}

			if ( previousThread ) {
				const thread = modmailChannel.threads.cache.find( t => t.id == previousThread.thread );
				if ( thread && !thread.archived ) {
					try {
						const replyTo = BotConfig.database.prepare( 'SELECT thread_message FROM modmail_messages WHERE dm_message = ?' ).get( origin.reference?.messageId ?? '' ) as { thread_message: string } | undefined;

						const copy = await thread.send( {
							content: origin.content,
							files: origin.attachments.map( file => ( {
								attachment: file.url,
								name: file.name ?? undefined,
							} ) ),
							reply: replyTo && { messageReference: replyTo.thread_message, failIfNotExists: false },
						} );

						await ModmailUtil.markDelivered( origin, thread.id, copy.id );
						return;
					} catch ( e ) {
						this.logger.error( e );
						await ModmailUtil.markFailed( origin );

						return;
					}
				} else {
					await this.removeAccentColor( modmailChannel, previousThread.thread );

					BotConfig.database.prepare(
						`DELETE FROM modmail_threads
						WHERE user = ?`
					).run( origin.author.id );

					BotConfig.database.prepare(
						`DELETE FROM modmail_messages
						WHERE thread = ?`
					).run( previousThread.thread );
				}
			}
			let start: Message | undefined;
			let newThread: ThreadChannel | undefined;
			try {
				start = await modmailChannel.send( {
					components: [ this.getStartContainer( origin ) ],
					flags: MessageFlags.IsComponentsV2,
				} );

				newThread = await start.startThread( {
					name: origin.author.tag,
					autoArchiveDuration: 1440,
				} );

				BotConfig.database.prepare(
					`INSERT INTO modmail_threads (user, thread)
					VALUES (?, ?)`
				).run( [ origin.author.id, newThread.id ] );

				const copy = await newThread.send( {
					content: origin.content,
					files: origin.attachments.map( file => ( {
						attachment: file.url,
						name: file.name ?? undefined,
					} ) ),
				} );

				await ModmailUtil.markDelivered( origin, newThread.id, copy.id );
			} catch ( e ) {
				this.logger.error( e );
				await this.discardThread( origin, start, newThread );
				await ModmailUtil.markFailed( origin );

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
	}

	private async discardThread( origin: Message, start?: Message, thread?: ThreadChannel ): Promise<void> {
		try {
			await thread?.delete();
			await start?.delete();
		} catch ( e ) {
			this.logger.error( e );
		}

		if ( thread ) {
			BotConfig.database.prepare(
				`DELETE FROM modmail_threads
				WHERE user = ?`
			).run( origin.author.id );

			BotConfig.database.prepare(
				`DELETE FROM modmail_messages
				WHERE thread = ?`
			).run( thread.id );
		}
	}

	private getStartContainer( origin: Message ): ContainerBuilder {
		const text = [ new TextDisplayBuilder().setContent( `### ${ origin.author }` ) ];
		if ( origin.content ) {
			text.push( new TextDisplayBuilder().setContent( origin.content.replace( /(^|\n)/g, '$1> ' ) ) );
		}

		return new ContainerBuilder()
			.setAccentColor( 0x2FCA74 )
			.addSectionComponents(
				new SectionBuilder()
					.addTextDisplayComponents( text )
					.setThumbnailAccessory( new ThumbnailBuilder().setURL( origin.author.displayAvatarURL() ) )
			);
	}

	private async removeAccentColor( channel: TextChannel, messageId: string ): Promise<void> {
		try {
			const message = await channel.messages.fetch( messageId );
			const container = message.components[0];
			if ( container?.type !== ComponentType.Container ) return;

			await message.edit( {
				components: [ { ...container.toJSON(), accent_color: null } ],
				flags: MessageFlags.IsComponentsV2,
			} );
		} catch ( e ) {
			this.logger.error( e );
		}
	}
}
