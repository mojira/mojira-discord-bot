import { NewsChannel, TextChannel, TextBasedChannel } from 'discord.js';

export class ChannelConfigUtil {
	// Indicates in the channel's description that mentions are disabled in that channel.
	// Tag: ~no-mention
	public static mentionsDisabled( channel: TextBasedChannel ): boolean {
		if ( channel instanceof TextChannel || channel instanceof NewsChannel ) {
			return channel.topic != null && channel.topic.includes( '~no-mention' );
		}
		return false;
	}

	// Indicates in the channel's description that commands are disabled in that channel.
	// Tag: ~no-command
	public static commandsDisabled( channel: TextBasedChannel ): boolean {
		if ( channel instanceof TextChannel || channel instanceof NewsChannel ) {
			return channel.topic != null && channel.topic.includes( '~no-command' );
		}
		return false;
	}

	// Indicates in the channel's description that mention embeds will have limited information.
	// Tag: ~limited-info
	public static limitedInfo( channel: TextBasedChannel ): boolean {
		if ( channel instanceof TextChannel || channel instanceof NewsChannel ) {
			return channel.topic != null && channel.topic.includes( '~limited-info' );
		}
		return false;
	}

	// Indicates in the channel's description that searches done by /search will not be ephemeral.
	// Tag: ~public-search
	public static publicSearch( channel: TextBasedChannel ): boolean {
		if ( channel instanceof TextChannel || channel instanceof NewsChannel ) {
			return channel.topic != null && channel.topic.includes( '~public-search' );
		}
		return false;
	}
}
