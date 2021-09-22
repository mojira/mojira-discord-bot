import { Message, MessageEmbed, TextChannel } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig, { PrependResponseMessageType } from '../../BotConfig';
import DiscordUtil from '../../util/DiscordUtil';
import { ReactionsUtil } from '../../util/ReactionsUtil';
import { RequestsUtil } from '../../util/RequestsUtil';
import EventHandler from '../EventHandler';

export default class RequestEventHandler implements EventHandler<'message'> {
	public readonly eventName = 'message';

	private logger = log4js.getLogger( 'RequestEventHandler' );

	/**
	 * A map from request channel IDs to internal channel objects.
	 */
	private readonly internalChannels: Map<string, string>;

	/**
	 * A map from request channel IDs to request limit numbers.
	 */
	private readonly requestLimits: Map<string, number>;

	constructor( internalChannels: Map<string, string>, requestLimits: Map<string, number> ) {
		this.internalChannels = internalChannels;
		this.requestLimits = requestLimits;
	}

	// This syntax is used to ensure that `this` refers to the `RequestEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		// we need this because this method gets invoked directly on bot startup instead of via the general MessageEventHandler
		if ( origin.type !== 'DEFAULT' ) {
			return;
		}

		if ( origin.channel instanceof TextChannel ) {
			this.logger.info( `${ origin.author.tag } posted request ${ origin.id } in #${ origin.channel.name }` );
		}

		try {
			await origin.reactions.removeAll();
		} catch ( error ) {
			this.logger.error( error );
		}

		const tickets = RequestsUtil.getTicketIdsFromString( origin.content );

		if ( BotConfig.request.noLinkEmoji && !tickets.length ) {
			try {
				await origin.react( BotConfig.request.noLinkEmoji );
			} catch ( error ) {
				this.logger.error( error );
			}

			try {
				const warning = await origin.channel.send( `${ origin.author }, your request (<${ origin.url }>) doesn't contain any valid ticket reference. If you'd like to add it you can edit your message.` );

				const timeout = BotConfig.request.warningLifetime;
				await warning.delete( { timeout } );
			} catch ( error ) {
				this.logger.error( error );
			}

			return;
		}

		if ( BotConfig.request.invalidRequestJql ) {
			if ( !await RequestsUtil.checkTicketValidity( tickets ) ) {
				try {
					await origin.react( BotConfig.request.invalidTicketEmoji );
				} catch ( error ) {
					this.logger.error( error );
				}

				try {
					const warning = await origin.channel.send( `${ origin.author }, your request (<${ origin.url }>) contains a ticket that is less than 24 hours old. Please wait until it is at least one day old before making a request.` );

					const timeout = BotConfig.request.warningLifetime;
					await warning.delete( { timeout } );
				} catch ( error ) {
					this.logger.error( error );
				}
				return;
			}
		}

		const requestLimit = this.requestLimits.get( origin.channel.id );
		const internalChannelId = this.internalChannels.get( origin.channel.id );
		const internalChannel = await DiscordUtil.getChannel( internalChannelId );

		if ( requestLimit && requestLimit >= 0 && internalChannel instanceof TextChannel ) {
			const internalChannelUserMessages = internalChannel.messages.cache
				.filter( message => message.embeds.length > 0 && message.embeds[0].author.name == origin.author.tag )
				.filter( message => new Date().valueOf() - message.embeds[0].timestamp.valueOf() <= 86400000 );
			if ( internalChannelUserMessages.size >= requestLimit ) {
				try {
					await origin.react( BotConfig.request.invalidTicketEmoji );
				} catch ( error ) {
					this.logger.error( error );
				}

				try {
					const warning = await origin.channel.send( `${ origin.author }, you have posted a lot of requests today that are still pending. Please wait for these requests to be resolved before posting more.` );

					const timeout = BotConfig.request.warningLifetime;
					await warning.delete( { timeout } );
				} catch ( error ) {
					this.logger.error( error );
				}
				return;
			}
		}

		if ( BotConfig.request.waitingEmoji ) {
			try {
				await origin.react( BotConfig.request.waitingEmoji );
			} catch ( error ) {
				this.logger.error( error );
			}
		}

		if ( internalChannel && internalChannel instanceof TextChannel ) {
			const embed = new MessageEmbed()
				.setColor( RequestsUtil.getEmbedColor() )
				.setAuthor( origin.author.tag, origin.author.avatarURL() )
				.setDescription( RequestsUtil.getRequestDescription( origin ) )
				.addField( 'Go To', `[Message](${ origin.url }) in ${ origin.channel }`, true )
				.setTimestamp( origin.createdAt );

			const response = BotConfig.request.prependResponseMessage == PrependResponseMessageType.Always
				? RequestsUtil.getResponseMessage( origin )
				: '';

			const copy = await internalChannel.send( response, embed ) as Message;

			if ( BotConfig.request.suggestedEmoji ) {
				await ReactionsUtil.reactToMessage( copy, [...BotConfig.request.suggestedEmoji] );
			}
		}
	};
}
