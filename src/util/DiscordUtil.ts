import MojiraBot from '../MojiraBot';
import { TextChannel, Message, AnyChannel, Guild, GuildMember, MessageReaction, User, Snowflake, PartialMessage } from 'discord.js';

export default class DiscordUtil {
	public static async getChannel( channelId: Snowflake ): Promise<AnyChannel | undefined> {
		return await MojiraBot.client.channels.fetch( channelId ) ?? undefined;
	}

	public static async getMessage( channel: TextChannel, messageId: Snowflake ): Promise<Message> {
		return await channel.messages.fetch( messageId );
	}

	public static async getMember( guild: Guild, userId: Snowflake ): Promise<GuildMember> {
		return await guild.members.fetch( userId );
	}

	public static async fetchMessage( message: Message | PartialMessage ): Promise<Message> {
		if ( message !== undefined && message.partial ) {
			message = await message.fetch();
		}
		return message as Message;
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

	public static deleteWithDelay( message: Message, timeout: number ): Promise<void> {
		return new Promise( ( resolve, reject ) => {
			setTimeout( async () => {
				try {
					await message.delete();
					resolve();
				} catch ( e ) {
					reject( e );
				}
			}, timeout );
		} );
	}
}
