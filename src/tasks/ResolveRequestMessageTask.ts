import MessageTask from './MessageTask';
import { Message, Emoji, ReactionEmoji, TextChannel, RichEmbed, User } from 'discord.js';
import MojiraBot from '../MojiraBot';
import BotConfig from '../BotConfig';
import { RequestsUtil } from '../util/RequestsUtil';

export default class ResolveRequestMessageTask extends MessageTask {
	private readonly emoji: Emoji | ReactionEmoji;
	private readonly user: User;

	constructor( emoji: Emoji | ReactionEmoji, user: User ) {
		super();
		this.emoji = emoji;
		this.user = user;
	}

	public async run( copy: Message ): Promise<void> {
		const result = RequestsUtil.getOriginIds( copy );
		if ( !result ) {
			return;
		}

		const originChannel = MojiraBot.client.channels.get( result.channelId ) as TextChannel;
		const origin = await originChannel.fetchMessage( result.messageId );

		await origin.clearReactions();
		origin.react( this.emoji );

		if ( copy.deletable ) {
			copy.delete();
		}

		if ( BotConfig.request.log_channel ) {
			const logChannel = MojiraBot.client.channels.get( BotConfig.request.log_channel );
			if ( logChannel && logChannel instanceof TextChannel ) {
				const log = new RichEmbed()
					.setColor( '#F7C6C9' )
					.setAuthor( this.user.tag, this.user.avatarURL )
					.setDescription( `**${this.user.tag}** resolved [this request](${origin.url}) in ${origin.channel} as ${this.emoji}.` )
					.setTimestamp( new Date() );
				logChannel.send( log );
			}
		}

	}
}