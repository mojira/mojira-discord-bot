import { Message, MessageEmbed, TextChannel } from 'discord.js';
import BotConfig from '../BotConfig';
import DiscordUtil from '../util/DiscordUtil';
import PrefixCommand from './PrefixCommand';
import Command from './Command';

export default class WhoisCommand extends PrefixCommand {
	public readonly aliases = ['who', 'whois'];

	public async run( message: Message, args: string ): Promise<boolean> {
		if ( !args.length ) {
			return false;
		}

		let fromDiscordWhois = false;
		if ( args.startsWith( '<@' ) ) {
			fromDiscordWhois = true;
		}

		const logChannel = await DiscordUtil.getChannel( BotConfig.verification.verificationLogChannel );

		if ( logChannel instanceof TextChannel ) {
			try {
				logChannel.messages.cache.forEach( async thisMessage => {
					const content = thisMessage.embeds;
					if ( content.length == 0 ) return false;
					const discordId = content[0].fields[0].value;
					const discordMember = await DiscordUtil.getMember( logChannel.guild, discordId.replace( /[<>!@]/g, '' ) );
					const mojiraMember = content[0].fields[1].value;

					const embed = new MessageEmbed()
						.setTitle( 'User information' );

					if ( fromDiscordWhois ) {
						if ( discordId.replace( /[<>!@]/g, '' ) != args.replace( /[<>!@]/g, '' ) ) return false;

						embed.setDescription( `${ discordMember.user }'s Mojira account is ${ mojiraMember } ` )
							.setFooter( message.author.tag, message.author.avatarURL() );
						await message.channel.send( embed );

						return true;
					} else {
						if ( mojiraMember.split( '?name=' )[1].split( ')' )[0] != args ) return false;

						embed.setDescription( `${ mojiraMember }'s Discord account is ${ discordId }` )
							.setFooter( message.author.tag, message.author.avatarURL() );
						await message.channel.send( embed );

						return true;
					}
				} );
			} catch ( error ) {
				Command.logger.error( error );
			}
		}
		return true;
	}

	public asString( args: string ): string {
		return `!jira whois ${ args }`;
	}
}
