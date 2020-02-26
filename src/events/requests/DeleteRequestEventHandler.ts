import { Message, TextChannel } from 'discord.js';
import * as log4js from 'log4js';
import EventHandler from '../EventHandler';
import { RequestsUtil } from '../../util/RequestsUtil';

export default class DeleteRequestEventHandler implements EventHandler {
	public readonly eventName = '';

	private logger = log4js.getLogger( 'DeleteRequestEventHandler' );

	/**
	 * A map from request channel IDs to internal channel objects.
	 */
	private readonly internalChannels: Map<string, TextChannel>;

	constructor( internalChannels: Map<string, TextChannel> ) {
		this.internalChannels = internalChannels;
	}

	// This syntax is used to ensure that `this` refers to the `DeleteRequestEventHandler` object
	public onEvent = async ( origin: Message ): Promise<void> => {
		this.logger.info( `User ${ origin.author.tag }'s request ${ origin.id } in channel ${ origin.channel.id } was deleted` );

		const internalChannel = this.internalChannels.get( origin.channel.id );
		if ( internalChannel ) {
			for ( const [, internalMessage] of internalChannel.messages ) {
				const result = RequestsUtil.getOriginIds( internalMessage );
				if ( !result ) {
					continue;
				}
				if ( result.channelId === origin.channel.id && result.messageId === origin.id ) {
					if ( internalMessage.deletable ) {
						internalMessage.delete();
					}
				}
			}
		}
	};
}