import { EmbedBuilder, Message, MessageType, Snowflake, TextChannel } from 'discord.js';
import log4js from 'log4js';
import BotConfig, { PrependResponseMessageType } from '../../BotConfig.js';
import DiscordUtil from '../../util/DiscordUtil.js';
import { ReactionsUtil } from '../../util/ReactionsUtil.js';
import { RequestsUtil } from '../../util/RequestsUtil.js';
import EventHandler from '../EventHandler.js';

export default class RequestEventHandler implements EventHandler<'messageCreate'> {
	public readonly eventName = 'messageCreate';

	private logger = log4js.getLogger( 'RequestEventHandler' );

	/**
	 * A map from request channel IDs to internal channel objects.
	 */
	private readonly internalChannels: Map<Snowflake, Snowflake>;

	/**
	 * A map from request channel IDs to request limit numbers.
	 */
	private readonly requestLimits: Map<Snowflake, number>;

	constructor( internalChannels: Map<Snowflake, Snowflake>, requestLimits: Map<Snowflake, number> ) {
		this.internalChannels = internalChannels;
		this.requestLimits = requestLimits;
	}

	// This syntax is used to ensure that `this` refers to the `RequestEventHandler` object
	public onEvent = async ( origin: Message, forced?: boolean ): Promise<void> => {
		// we need this because this method gets invoked directly on bot startup instead of via the general MessageEventHandler
		if ( origin.type !== MessageType.Default ) {
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
				await DiscordUtil.deleteWithDelay( warning, BotConfig.request.warningLifetime );
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
					await DiscordUtil.deleteWithDelay( warning, BotConfig.request.warningLifetime );
				} catch ( error ) {
					this.logger.error( error );
				}
				return;
			}
		}

		const requestLimit = this.requestLimits.get( origin.channel.id );
		const internalChannelId = this.internalChannels.get( origin.channel.id );
		if ( internalChannelId === undefined ) return;

		const internalChannel = await DiscordUtil.getChannel( internalChannelId );

		if ( !forced && requestLimit && requestLimit >= 0 && internalChannel instanceof TextChannel ) {
			// Check for 24 hour rolling window request limit
			const internalChannelUserMessages = internalChannel.messages.cache
				.filter( message => message.embeds.length > 0 && message.embeds[0].author?.name === origin.author.tag )
				.filter( message => {
					// Check if message is at most 24 hours old
					if ( message.embeds[0].timestamp === null ) return false;
					const messageTimestamp = new Date( message.embeds[0].timestamp ).getTime();
					return new Date().getTime() - messageTimestamp <= 86400000;
				} );
			if ( internalChannelUserMessages.size >= requestLimit ) {
				try {
					await origin.react( BotConfig.request.invalidTicketEmoji );
				} catch ( error ) {
					this.logger.error( error );
				}

				try {
					const warning = await origin.channel.send( `${ origin.author }, you have posted a lot of requests today that are still pending. Please wait for these requests to be resolved before posting more.` );
					await DiscordUtil.deleteWithDelay( warning, BotConfig.request.warningLifetime );
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
			const embed = new EmbedBuilder()
				.setColor( RequestsUtil.getEmbedColor() )
				.setAuthor( { name: origin.author.tag, iconURL: origin.author.avatarURL() ?? undefined } )
				.setDescription( RequestsUtil.getRequestDescription( origin ) )
				.addFields( {
					name: 'Go To',
					value: `[Message](${ origin.url }) in ${ origin.channel }`,
					inline: true,
				} )
				.setTimestamp( origin.createdAt );

			const response = BotConfig.request.prependResponseMessage == PrependResponseMessageType.Always
				? RequestsUtil.getResponseMessage( origin )
				: ' ';

			const copy = await internalChannel.send( { content: response, embeds: [embed] } );

			if ( BotConfig.request.suggestedEmoji ) {
				await ReactionsUtil.reactToMessage( copy, [...BotConfig.request.suggestedEmoji] );
			}
		}
	};
}
