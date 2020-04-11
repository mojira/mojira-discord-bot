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
		const origin = await RequestsUtil.getOriginMessage( copy );

		if ( origin ) {
			await origin.clearReactions();
			origin.react( this.emoji );

			if ( copy.deletable ) {
				copy.delete();
			}

			if ( BotConfig.request.log_channel ) {
				const logChannel = MojiraBot.client.channels.get( BotConfig.request.log_channel );
				if ( logChannel && logChannel instanceof TextChannel ) {
					const response = BotConfig.request.prepend_response_message_in_log ?
						RequestsUtil.getResponseMessage( origin ) : '';

					const log = new RichEmbed()
						.setColor( 'GREEN' )
						.setAuthor( origin.author.tag, origin.author.avatarURL )
						.setDescription( origin.content )
						.addField( 'Channel', origin.channel.toString(), true )
						.addField( 'Message', `[Here](${ origin.url })`, true )
						.setFooter( `${ this.user.tag } resolved as ${ this.emoji }`, this.user.avatarURL )
						.setTimestamp( new Date() );
					logChannel.send( response, log );
				}
			}
		}
	}
}