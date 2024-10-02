import { Message, PartialMessage, Snowflake, TextChannel } from 'discord.js';
import log4js from 'log4js';
import EventHandler from '../EventHandler.js';
import { RequestsUtil } from '../../util/RequestsUtil.js';
import TaskScheduler from '../../tasks/TaskScheduler.js';
import DiscordUtil from '../../util/DiscordUtil.js';

export default class RequestDeleteEventHandler implements EventHandler<'messageDelete'> {
	public readonly eventName = 'messageDelete';

	private logger = log4js.getLogger( 'RequestDeleteEventHandler' );

	/**
	 * A map from request channel IDs to internal channel objects.
	 */
	private readonly internalChannels: Map<Snowflake, Snowflake>;

	constructor( internalChannels: Map<Snowflake, Snowflake> ) {
		this.internalChannels = internalChannels;
	}

	// This syntax is used to ensure that `this` refers to the `RequestDeleteEventHandler` object
	public onEvent = async ( origin: Message | PartialMessage ): Promise<void> => {
		origin = await DiscordUtil.fetchMessage( origin );

		this.logger.info( `User ${ origin.author.tag }'s request ${ origin.id } in channel ${ origin.channel.id } was deleted` );

		const internalChannelId = this.internalChannels.get( origin.channel.id );
		if ( internalChannelId === undefined ) return;

		const internalChannel = await DiscordUtil.getChannel( internalChannelId );

		if ( internalChannel && internalChannel instanceof TextChannel ) {
			for ( const [, internalMessage] of internalChannel.messages.cache ) {
				const result = await RequestsUtil.getOriginIds( internalMessage );
				if ( !result ) {
					continue;
				}
				if ( result.channelId === origin.channel.id && result.messageId === origin.id ) {
					TaskScheduler.clearMessageTasks( internalMessage );
					if ( internalMessage.deletable ) {
						try {
							await internalMessage.delete();
						} catch ( error ) {
							this.logger.error( error );
						}
					}
				}
			}
		}
	};
}
