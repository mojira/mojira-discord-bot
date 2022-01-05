import MojiraBot from '../MojiraBot';
import { TextChannel, Message, Channel, Guild, GuildMember, MessageReaction, User } from 'discord.js';

export default class DiscordUtil {
	public static async getChannel( channelId: string ): Promise<Channel> {
		return await MojiraBot.client.channels.fetch( channelId );
	}

	public static async getMessage( channel: TextChannel, messageId: string ): Promise<Message> {
		return await channel.messages.fetch( messageId );
	}

	public static async getMember( guild: Guild, userId: string ): Promise<GuildMember> {
		return await guild.members.fetch( userId );
	}

	public static async fetchMessage( message: Message ): Promise<Message> {
		if ( !message.deleted && message.partial ) {
			message = await message.fetch();
		}
		return message;
	}

	public static async fetchReaction( reaction: MessageReaction ): Promise<MessageReaction> {
		if ( reaction.partial ) {
			reaction = await reaction.fetch();
		}
		return reaction;
	}

	public static async fetchUser( user: User ): Promise<User> {
		if ( user.partial ) {
			user = await user.fetch();
		}
		return user;
	}
}