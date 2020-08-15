import { EmojiResolvable, Message, MessageEmbed, TextChannel, User } from 'discord.js';
import BotConfig from '../BotConfig';
import DiscordUtil from '../util/DiscordUtil';
import { RequestsUtil } from '../util/RequestsUtil';
import MessageTask from './MessageTask';

export default class ResolveRequestMessageTask extends MessageTask {
	private readonly emoji: EmojiResolvable;
	private readonly user: User;

	constructor( emoji: EmojiResolvable, user: User ) {
		super();
		this.emoji = emoji;
		this.user = user;
	}

	public async run( copy: Message ): Promise<void> {
		const origin = await RequestsUtil.getOriginMessage( copy );

		if ( copy.deletable ) {
			copy.delete();
		}

		if ( origin ) {
			await origin.reactions.removeAll();
			origin.react( this.emoji );

			if ( BotConfig.request.logChannel ) {
				const logChannel = await DiscordUtil.getChannel( BotConfig.request.logChannel );
				if ( logChannel && logChannel instanceof TextChannel ) {
					const response = BotConfig.request.prependResponseMessageInLog ?
						RequestsUtil.getResponseMessage( origin ) : '';

					const log = new MessageEmbed()
						.setColor( 'GREEN' )
						.setAuthor( origin.author.tag, origin.author.avatarURL() )
						.setDescription( origin.content )
						.addField( 'Channel', origin.channel.toString(), true )
						.addField( 'Message', `[Here](${ origin.url })`, true )
						.setFooter( `${ this.user.tag } resolved as ${ this.emoji }`, this.user.avatarURL() )
						.setTimestamp( new Date() );
					logChannel.send( response, log );
				}
			}
		}
	}
}