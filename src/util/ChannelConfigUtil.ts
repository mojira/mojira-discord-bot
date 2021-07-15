import { Channel, Message, NewsChannel, TextChannel } from 'discord.js';
import * as log4js from 'log4js';

export class ChannelConfigUtil {
	private static logger = log4js.getLogger( 'ChannelConfigUtil' );

    // Indicates in the channel's description that mentions are disabled in that channel.
    // Tag: ~no-mention
	public static mentionsDisabled( channel: Channel ): boolean {
        if ( channel instanceof TextChannel || channel instanceof NewsChannel ) {
            return channel.topic.includes( '~no-mention' );
        }
        return false;
    }

    // Indicates in the channel's description that commands (including mentions) are disabled in that channel.
    // Tag: ~no-command
    public static commandsDisabled( channel: Channel ): boolean {
        if ( channel instanceof TextChannel || channel instanceof NewsChannel ) {
            return channel.topic.includes( '~no-command' );
        }
        return false;
    }

    // Indicates in the channel's description that mention embeds will have limited information.
    // Tag: ~limited-info
    public static limitedInfo( channel: Channel ): boolean {
        if ( channel instanceof TextChannel || channel instanceof NewsChannel ) {
            return channel.topic.includes( '~limited-info' );
        }
        return false;
    }
}