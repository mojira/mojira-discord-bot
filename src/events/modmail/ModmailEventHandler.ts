import { ActionRowBuilder, AnyThreadChannel, ButtonBuilder, ButtonInteraction, ButtonStyle, Client, ContainerBuilder, Message, MessageFlags, MessageType, SectionBuilder, SendableChannels, Snowflake, TextChannel, TextDisplayBuilder, ThreadChannel, ThumbnailBuilder } from 'discord.js';
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
	private readonly maxFollowUpAge = 7 * 24 * 60 * 60 * 1000;

	private readonly followUpId = 'modmail-follow-up';
	private readonly newConversationId = 'modmail-new-conversation';

	// This syntax is used to ensure that `this` refers to the `ModmailEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		await ModmailUtil.queue( origin.channel, () => this.handle( origin ) );
	};

	public onButton = async ( interaction: ButtonInteraction ): Promise<void> => {
		if ( interaction.customId !== this.followUpId && interaction.customId !== this.newConversationId ) return;

		try {
			await interaction.deferUpdate();
			await interaction.message.delete();
		} catch ( e ) {
			// Only the click that removed the prompt resolves it
			this.logger.error( e );
			return;
		}

		await ModmailUtil.queue( await interaction.user.createDM(), () => this.resolvePrompt( interaction ) );
	};

	private async handle( origin: Message ): Promise<void> {
		if ( !origin.channel.isSendable() ) {
			return;
		}

		if ( ModmailUtil.isBanned( origin.author.id ) ) {
			try {
				if ( ModmailUtil.markBanNotified( origin.author.id ) ) {
					await origin.channel.send( {
						components: [ this.getBanContainer() ],
						flags: MessageFlags.IsComponentsV2,
					} );
				}

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

		const latest = ModmailUtil.findLatestThread( origin.author.id );
		if ( latest === undefined ) {
			await this.createThread( origin, modmailChannel );
			return;
		}

		try {
			// Replies to the closed conversation are follow-ups without asking
			if ( latest.status !== 'open' && !ModmailUtil.belongsTo( origin.reference?.messageId ?? '', latest.thread ) ) {
				// A week after its last message, a new conversation starts instead, unless the user is already deciding
				const pending = await this.removePrompt( origin.channel );
				if ( pending || origin.createdTimestamp - ModmailUtil.getLastActivity( latest.thread ) <= this.maxFollowUpAge ) {
					await this.prompt( origin.channel );
				} else {
					await this.createThread( origin, modmailChannel );
				}

				return;
			}

			const thread = await origin.client.channels.fetch( latest.thread ) as AnyThreadChannel;
			if ( latest.status !== 'open' ) {
				await this.reopen( thread );
			}

			await this.forward( origin, thread );
		} catch ( e ) {
			this.logger.error( e );
			await ModmailUtil.markFailed( origin );
		}
	}

	/**
	 * Reopens a closed conversation and delivers the messages that its prompt held back
	 */
	public async reopen( thread: AnyThreadChannel, prompt?: Message ): Promise<void> {
		const user = ModmailUtil.findUser( thread );
		if ( user === undefined || !await ModmailUtil.reopenThread( thread.id ) ) {
			return;
		}

		for ( const message of await this.takeHeld( thread.client, user, prompt ) ) {
			try {
				await this.forward( message, thread );
			} catch ( e ) {
				this.logger.error( e );
				await ModmailUtil.markFailed( message );
			}
		}
	}

	/**
	 * Lets the user decide whether their messages continue their closed conversation or start a new one
	 */
	private async prompt( channel: SendableChannels ): Promise<void> {
		await channel.send( {
			components: [ this.getPromptContainer() ],
			flags: MessageFlags.IsComponentsV2,
		} );
	}

	private async resolvePrompt( interaction: ButtonInteraction ): Promise<void> {
		try {
			const latest = ModmailUtil.findLatestThread( interaction.user.id );
			if ( latest === undefined || ModmailUtil.isBanned( interaction.user.id ) ) {
				return;
			}

			if ( interaction.customId === this.followUpId ) {
				await this.reopen( await interaction.client.channels.fetch( latest.thread ) as AnyThreadChannel, interaction.message );
				return;
			}

			const modmailChannel = await DiscordUtil.getChannel( BotConfig.modmailChannel );
			const origin = ( await this.takeHeld( interaction.client, interaction.user.id, interaction.message ) ).pop();
			if ( modmailChannel instanceof TextChannel && origin ) {
				await this.createThread( origin, modmailChannel );
			}
		} catch ( e ) {
			this.logger.error( e );
		}
	}

	/**
	 * Removes a pending prompt, unless it's already gone, and returns the messages it held back
	 */
	private async takeHeld( client: Client, user: Snowflake, prompt?: Message ): Promise<Message[]> {
		prompt ??= await this.removePrompt( await ( await client.users.fetch( user ) ).createDM() );
		return prompt ? this.getBacklog( prompt, user ) : [];
	}

	/**
	 * Removes the pending prompt of a DM and returns it
	 */
	private async removePrompt( channel: SendableChannels ): Promise<Message | undefined> {
		const prompt = ( await channel.messages.fetch( { limit: 20 } ) ).find( message =>
			message.author.id === channel.client.user.id && message.resolveComponent( this.followUpId ) !== null );

		await prompt?.delete();
		return prompt;
	}

	private async createThread( origin: Message, modmailChannel: TextChannel ): Promise<void> {
		let start: Message | undefined;
		let thread: ThreadChannel | undefined;
		try {
			const backlog = await this.getBacklog( origin, origin.author.id );

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
	 * A user's recent messages right before another message that weren't handled yet, e.g. because the bot was offline
	 */
	private async getBacklog( before: Message, user: Snowflake ): Promise<Message[]> {
		const messages = ( await before.channel.messages.fetch( { before: before.id, limit: 100 } ) )
			.sort( ( a, b ) => b.createdTimestamp - a.createdTimestamp );

		const backlog: Message[] = [];
		for ( const message of messages.values() ) {
			if (
				message.author.id !== user
				|| message.reactions.cache.some( reaction => reaction.me )
				|| before.createdTimestamp - message.createdTimestamp > this.maxBacklogAge
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
			.setAccentColor( ModmailUtil.accentColor )
			.addSectionComponents(
				new SectionBuilder()
					.addTextDisplayComponents( text )
					.setThumbnailAccessory( new ThumbnailBuilder().setURL( origin.author.displayAvatarURL() ) )
			);
	}

	private getPromptContainer(): ContainerBuilder {
		return new ContainerBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent( '**Your previous conversation has been closed.** Do you want to reopen it because this message is a follow-up, or is it a different topic that should go into a new conversation?' )
			)
			.addActionRowComponents(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder().setCustomId( this.followUpId ).setLabel( 'Follow up' ).setStyle( ButtonStyle.Secondary ),
					new ButtonBuilder().setCustomId( this.newConversationId ).setLabel( 'New Modmail' ).setStyle( ButtonStyle.Secondary )
				)
			);
	}

	private getBanContainer(): ContainerBuilder {
		return new ContainerBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent( 'We\'re sorry, but you have been **banned** from sending any further ModMail messages.' )
			);
	}
}
