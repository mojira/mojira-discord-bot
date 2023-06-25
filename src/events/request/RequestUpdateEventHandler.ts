import { EmbedBuilder, Message, Snowflake, TextChannel } from 'discord.js';
import log4js from 'log4js';
import EventHandler from '../EventHandler.js';
import { RequestsUtil } from '../../util/RequestsUtil.js';
import DiscordUtil from '../../util/DiscordUtil.js';

export default class RequestUpdateEventHandler implements EventHandler<'messageUpdate'> {
	public readonly eventName = 'messageUpdate';

	private logger = log4js.getLogger( 'RequestUpdateEventHandler' );

	/**
	 * A map from request channel IDs to internal channel objects.
	 */
	private readonly internalChannels: Map<Snowflake, Snowflake>;

	constructor( internalChannels: Map<Snowflake, Snowflake> ) {
		this.internalChannels = internalChannels;
	}

	// This syntax is used to ensure that `this` refers to the `RequestUpdateEventHandler` object
	public onEvent = async ( oldMessage: Message, newMessage: Message ): Promise<void> => {
		this.logger.info(
			`User ${ DiscordUtil.getUserHandle( oldMessage.author ) }'s request ${ oldMessage.id } in channel ${ oldMessage.channel.id } was updated`
		);

		const internalChannelId = this.internalChannels.get( oldMessage.channel.id );
		if ( internalChannelId === undefined ) return;

		const internalChannel = await DiscordUtil.getChannel( internalChannelId );

		if ( internalChannel && internalChannel instanceof TextChannel ) {
			for ( const [, internalMessage] of internalChannel.messages.cache ) {
				const result = await RequestsUtil.getOriginIds( internalMessage );
				if ( !result ) {
					continue;
				}
				if ( result.channelId === oldMessage.channel.id && result.messageId === oldMessage.id ) {
					try {
						const embed = new EmbedBuilder( internalMessage.embeds[0].data );
						embed.setAuthor( DiscordUtil.getUserAsEmbedAuthor( oldMessage.author ) );
						embed.setDescription( RequestsUtil.getRequestDescription( newMessage ) );
						await internalMessage.edit( { embeds: [embed] } );
					} catch ( error ) {
						this.logger.error( error );
					}
				}
			}
		}
	};
}
