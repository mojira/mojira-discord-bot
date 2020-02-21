import MessageTask from './MessageTask';
import { Message, Emoji, ReactionEmoji, TextChannel, RichEmbed, User } from 'discord.js';
import MojiraBot from '../MojiraBot';
import BotConfig from '../BotConfig';

export default class ResolveRequestMessageTask extends MessageTask {
	private readonly emoji: Emoji | ReactionEmoji;
	private readonly user: User;

	constructor( emoji: Emoji | ReactionEmoji, user: User ) {
		super();
		this.emoji = emoji;
		this.user = user;
	}

	public async run( copy: Message ): Promise<void> {
		let channelID: string;
		let messageID: string;
		for ( const field of copy.embeds[0].fields ) {
			if ( field.name === 'Channel' ) {
				channelID = field.value;
			} else if ( field.name === 'Message' ) {
				messageID = field.value;
			}
		}

		if ( !channelID || !messageID ) {
			return;
		}

		const origin = ( MojiraBot.client.channels.get( channelID ) as TextChannel ).messages.get( messageID );

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
					.setDescription( `**${this.user.tag}** resolved an request as ${this.emoji}.` )
					.addField( 'Channel', `${origin.channel}<br>[Go To Request](${origin.url})` );
				logChannel.send( log );
			}
		}

	}
}