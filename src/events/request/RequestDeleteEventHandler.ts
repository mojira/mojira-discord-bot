import { Message, TextChannel } from 'discord.js';
import * as log4js from 'log4js';
import EventHandler from '../EventHandler';
import { RequestsUtil } from '../../util/RequestsUtil';
import TaskScheduler from '../../tasks/TaskScheduler';
import DiscordUtil from '../../util/DiscordUtil';

export default class RequestDeleteEventHandler implements EventHandler<'messageDelete'> {
	public readonly eventName = 'messageDelete';

	private logger = log4js.getLogger( 'RequestDeleteEventHandler' );

	/**
	 * A map from request channel IDs to internal channel objects.
	 */
	private readonly internalChannels: Map<string, string>;
	private readonly internalChannelNames: Map<string, string>;

	constructor( internalChannels: Map<string, string>, internalChannelNames: Map<string, string> ) {
		this.internalChannels = internalChannels;
		this.internalChannelNames = internalChannelNames;
	}

	// This syntax is used to ensure that `this` refers to the `RequestDeleteEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		this.logger.info( `User ${ origin.author.tag }'s request ${ origin.id } in channel ${ origin.channel.id } was deleted` );

		const internalChannelId = this.internalChannels.get( origin.channel.id );
		const internalChannel = await DiscordUtil.getChannel( internalChannelId );
		const internalChannelName = this.internalChannelNames.get( internalChannelId );

		if ( internalChannel && internalChannel instanceof TextChannel ) {
			for ( const [, internalMessage] of internalChannel.messages.cache ) {
				const result = RequestsUtil.getOriginIds( internalMessage );
				if ( !result ) {
					continue;
				}
				if ( result.channelId === origin.channel.id && result.messageId === origin.id ) {
					TaskScheduler.clearMessageTasks( internalMessage );
					if ( internalMessage.deletable ) {
						try {
							await internalMessage.delete();
							const messageCount = internalChannel.messages.cache.size;
							await internalChannel.setName( `${ messageCount }-${ internalChannelName }` );
						} catch ( error ) {
							this.logger.error( error );
						}
					}
				}
			}
		}
	};
}