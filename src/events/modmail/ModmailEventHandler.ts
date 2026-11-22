import { ComponentType, ContainerBuilder, Message, MessageFlags, MessageType, SectionBuilder, TextChannel, TextDisplayBuilder, ThreadChannel, ThumbnailBuilder } from 'discord.js';
import log4js from 'log4js';
import BotConfig from '../../BotConfig.js';
import DiscordUtil from '../../util/DiscordUtil.js';
import { ModmailUtil } from '../../util/ModmailUtil.js';
import EventHandler from '../EventHandler.js';

export default class ModmailEventHandler implements EventHandler<'messageCreate'> {
	public readonly eventName = 'messageCreate';

	private logger = log4js.getLogger( 'ModmailEventHandler' );

	private readonly maxPreviewLength = 200;
	private readonly maxBacklogAge = 48 * 60 * 60 * 1000;

	// This syntax is used to ensure that `this` refers to the `ModmailEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		await ModmailUtil.queue( origin.channel, () => this.handle( origin ) );
	};

	private async handle( origin: Message ): Promise<void> {
		if ( !origin.channel.isSendable() ) {
			return;
		}

		const banStatus = BotConfig.database.prepare( 'SELECT user FROM modmail_bans WHERE user = ?' ).get( origin.author.id );
		if ( banStatus !== undefined ) {
			try {
				await origin.channel.send( 'We\'re sorry, but you have been banned from sending any further modmail messages.' );
				await origin.react( '❌' );
			} catch ( e ) {
				this.logger.error( e );
			}

			return;
		}

		const modmailChannel = await DiscordUtil.getChannel( BotConfig.modmailChannel );
		if ( !( modmailChannel instanceof TextChannel ) ) {
			return;
		}

		if ( !ModmailUtil.canForward( origin ) ) {
			await ModmailUtil.markFailed( origin );
			return;
		}

		const previousThread = ModmailUtil.findThread( origin.author.id );
		if ( previousThread ) {
			const thread = await modmailChannel.threads.fetch( previousThread ).catch( () => null );
			if ( thread && !thread.archived ) {
				try {
					await this.forward( origin, thread );
				} catch ( e ) {
					this.logger.error( e );
					await ModmailUtil.markFailed( origin );
				}

				return;
			}

			await this.removeAccentColor( modmailChannel, previousThread );
			ModmailUtil.closeThread( previousThread );
		}

		await this.createThread( origin, modmailChannel );
	}

	private async createThread( origin: Message, modmailChannel: TextChannel ): Promise<void> {
		let start: Message | undefined;
		let thread: ThreadChannel | undefined;
		try {
			const backlog = await this.getBacklog( origin );

			start = await modmailChannel.send( {
				components: [ this.getStartContainer( backlog[0] ?? origin ) ],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { parse: [] },
			} );

			thread = await start.startThread( {
				name: origin.author.tag,
				autoArchiveDuration: 1440,
			} );

			ModmailUtil.addThread( origin.author.id, thread.id );

			for ( const message of backlog ) {
				if ( ModmailUtil.canForward( message ) ) {
					await this.forward( message, thread );
				} else {
					await ModmailUtil.markFailed( message );
				}
			}

			await this.forward( origin, thread );
		} catch ( e ) {
			this.logger.error( e );
			await this.discardThread( start, thread );
			await ModmailUtil.markFailed( origin );
		}
	}

	private async forward( origin: Message, thread: ThreadChannel ): Promise<void> {
		const replyTo = await ModmailUtil.findCopy( origin.client, origin.reference?.messageId ?? '' );

		const copy = await thread.send( {
			...ModmailUtil.getPayload( origin ),
			reply: replyTo && { messageReference: replyTo.id, failIfNotExists: false },
		} );

		await ModmailUtil.markDelivered( origin, thread.id, copy.id );
	}

	/**
	 * Recent messages right before the origin that were never handled, e.g. because the bot was offline
	 */
	private async getBacklog( origin: Message ): Promise<Message[]> {
		const messages = ( await origin.channel.messages.fetch( { before: origin.id, limit: 100 } ) )
			.sort( ( a, b ) => b.createdTimestamp - a.createdTimestamp );

		const backlog: Message[] = [];
		for ( const message of messages.values() ) {
			if (
				message.author.id !== origin.author.id
				|| message.reactions.cache.some( reaction => reaction.me )
				|| origin.createdTimestamp - message.createdTimestamp > this.maxBacklogAge
			) break;

			if ( message.type === MessageType.Default || message.type === MessageType.Reply ) {
				backlog.unshift( message );
			}
		}

		return backlog;
	}

	private async discardThread( start?: Message, thread?: ThreadChannel ): Promise<void> {
		try {
			await thread?.delete();
			await start?.delete();
		} catch ( e ) {
			this.logger.error( e );
		}

		if ( thread ) {
			ModmailUtil.removeThread( thread.id );
		}
	}

	private getStartContainer( origin: Message ): ContainerBuilder {
		const text = [ new TextDisplayBuilder().setContent( `### ${ origin.author }` ) ];
		if ( origin.content ) {
			const preview = origin.content.length > this.maxPreviewLength ? `${ origin.content.slice( 0, this.maxPreviewLength ) }…` : origin.content;
			text.push( new TextDisplayBuilder().setContent( preview.replace( /(^|\n)/g, '$1> ' ) ) );
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
