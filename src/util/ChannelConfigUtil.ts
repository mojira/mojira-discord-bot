import { NewsChannel, TextChannel, ThreadChannel, TextBasedChannels } from 'discord.js';

export class ChannelConfigUtil {
	// Indicates in the channel's description that mentions are disabled in that channel.
	// Tag: ~no-mention
	public static mentionsDisabled( channel: TextBasedChannels ): boolean {
		if ( channel instanceof TextChannel || channel instanceof NewsChannel || channel instanceof ThreadChannel ) {
			return channel.topic != null && channel.topic.includes( '~no-mention' );
		}
		return false;
	}

	// Indicates in the channel's description that commands are disabled in that channel.
	// Tag: ~no-command
	public static commandsDisabled( channel: TextBasedChannels ): boolean {
		if ( channel instanceof TextChannel || channel instanceof NewsChannel || channel instanceof ThreadChannel ) {
			return channel.topic != null && channel.topic.includes( '~no-command' );
		}
		return false;
	}

	// Indicates in the channel's description that mention embeds will have limited information.
	// Tag: ~limited-info
	public static limitedInfo( channel: TextBasedChannels ): boolean {
		if ( channel instanceof TextChannel || channel instanceof NewsChannel || channel instanceof ThreadChannel ) {
			return channel.topic != null && channel.topic.includes( '~limited-info' );
		}
		return false;
	}
}
