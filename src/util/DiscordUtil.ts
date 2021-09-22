import * as log4js from 'log4js';
import MojiraBot from '../MojiraBot';
import { TextChannel, Message, Channel, Guild, GuildMember, MessageReaction, User, Snowflake, PartialMessage, MessageOptions } from 'discord.js';

export default class DiscordUtil {
	private static logger = log4js.getLogger( 'DiscordUtil' );

	public static async getChannel( channelId: Snowflake ): Promise<Channel> {
		if ( MojiraBot.client.channels.cache.has( channelId ) ) {
			return MojiraBot.client.channels.cache.get( channelId );
		}

		return await MojiraBot.client.channels.fetch( channelId );
	}

	public static async getMessage( channel: TextChannel, messageId: Snowflake ): Promise<Message> {
		if ( channel.messages.cache.has( messageId ) ) {
			return channel.messages.cache.get( messageId );
		}

		return await channel.messages.fetch( messageId );
	}

	public static async getMember( guild: Guild, userId: Snowflake ): Promise<GuildMember> {
		if ( guild.members.cache.has( userId ) ) {
			return guild.members.cache.get( userId );
		}

		return await guild.members.fetch( userId );
	}

	public static async fetchMessage( message: Message | PartialMessage ): Promise<Message> {
		if ( message.partial ) {
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

	public static async sendMentionMessage( origin: Message, content: MessageOptions ): Promise<void> {
		try {
			if ( origin.reference?.messageId ) {
				const replyTo = await origin.fetchReference();
				if ( replyTo === undefined || replyTo.deleted ) return;
				if ( origin.mentions.users.first()?.id == replyTo.author.id ) {
					await replyTo.reply( { ...content, allowedMentions: { repliedUser: true } } );
				} else {
					await replyTo.reply( { ...content, allowedMentions: { repliedUser: false } } );
				}
			} else {
				await origin.channel.send( content );
			}
		} catch ( e ) {
			this.logger.error( e );
		}
	}
}