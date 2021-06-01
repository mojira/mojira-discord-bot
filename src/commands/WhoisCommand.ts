import { Message, MessageEmbed, TextChannel } from 'discord.js';
import BotConfig from '../BotConfig';
import DiscordUtil from '../util/DiscordUtil';
import PrefixCommand from './PrefixCommand';
import Command from './Command';

export default class WhoisCommand extends PrefixCommand {
	public readonly aliases = ['who', 'whois'];

	public async run( origin: Message, args: string ): Promise<boolean> {
		if ( !args.length ) {
			return false;
		}

		let foundEmbed = false;

		let fromDiscordWhois = false;
		if ( args.startsWith( '<@' ) ) {
			fromDiscordWhois = true;
		}

		const logChannel = await DiscordUtil.getChannel( BotConfig.verification.verificationLogChannel );

		if ( logChannel instanceof TextChannel ) {
			const cachedMessages = logChannel.messages.cache;
			try {
				for ( const loop of cachedMessages ) {
					const thisMessage = loop[1];
					const content = thisMessage.embeds;
					if ( content.length == 0 ) continue;
					const discordId = content[0].fields[0].value;
					const discordMember = await DiscordUtil.getMember( logChannel.guild, discordId.replace( /[<>!@]/g, '' ) );
					const mojiraMember = content[0].fields[1].value;

					const embed = new MessageEmbed()
						.setTitle( 'User information' );

					if ( fromDiscordWhois ) {
						if ( discordId.replace( /[<>!@]/g, '' ) != args.replace( /[<>!@]/g, '' ) ) continue;
						foundEmbed = true;

						embed.setDescription( `${ discordMember.user }'s Mojira account is ${ mojiraMember } ` )
							.setFooter( origin.author.tag, origin.author.avatarURL() );
						await origin.channel.send( embed );
					} else {
						if ( mojiraMember.split( '?name=' )[1].split( ')' )[0] != args ) continue;
						foundEmbed = true;

						embed.setDescription( `${ mojiraMember }'s Discord account is ${ discordId }` )
							.setFooter( origin.author.tag, origin.author.avatarURL() );
						await origin.channel.send( embed );
					}
				}

				if ( !foundEmbed ) {
					const embed = new MessageEmbed()
						.setTitle( 'User information' )
						.setDescription( `User ${ args } not found` );
					await origin.channel.send( embed );
					return false;
				}

				return true;
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
