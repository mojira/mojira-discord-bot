import { ChannelLogsQueryOptions, Message, MessageEmbed, TextChannel } from 'discord.js';
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

		if ( message.deletable ) {
			try {
				await message.delete();
			} catch ( error ) {
				Command.logger.error( error );
			}
		} else {
			Command.logger.log( 'Message not deletable' );
		}


		const logChannel = await DiscordUtil.getChannel( BotConfig.verification.verificationLogChannel );
		const allMessages: Message[] = [];
		let lastId: string | undefined;
		let continueSearch = true;

		try {
			while ( continueSearch ) {
				const options: ChannelLogsQueryOptions = { limit: 50 };
				if ( lastId ) {
					options.before = lastId;
				}
				if ( logChannel instanceof TextChannel ) {

					const messages = await logChannel.messages.fetch( options );
					allMessages.push( ...messages.array() );
					lastId = messages.last()?.id;
					if ( messages.size !== 50 || !lastId ) {
						continueSearch = false;

						for ( let i = 0; i < allMessages.length; i++ ) {
							const content = allMessages[i].embeds;
							if ( content === undefined ) continue;

							const discordId = content[0].fields[0].value;
							const discordMember = await DiscordUtil.getMember( logChannel.guild, discordId.replace( /[<>!@]/g, '' ) );
							const mojiraMember = content[0].fields[1].value;

							if ( fromDiscordWhois ) {
								if ( discordId.replace( /[<>!@]/g, '' ) != args.replace( /[<>!@]/g, '' ) ) continue;

								const embed = new MessageEmbed()
									.setTitle( 'User information' )
									.setDescription( `${ discordMember.user }'s Mojira account is ${ mojiraMember } ` )
									.setFooter( message.author.tag, message.author.avatarURL() );
								await message.channel.send( embed );

								return true;
							} else {
								if ( mojiraMember.split( '?name=' )[1].split( ')' )[0] != args ) continue;

								const embed = new MessageEmbed()
									.setTitle( 'User information' )
									.setDescription( `${ mojiraMember }'s Discord account is ${ discordId }` )
									.setFooter( message.author.tag, message.author.avatarURL() );
								await message.channel.send( embed );

								return true;
							}
						}
						await message.channel.send( `${ args } has not been verified!` );
					}
				}
			}
		} catch {
			return false;
		}
		return true;
	}

	public asString( args: string ): string {
		return `!jira whois ${ args }`;
	}
}
