import { Message, MessageEmbed, TextChannel, User } from 'discord.js';
import PrefixCommand from './PrefixCommand';
import BotConfig from '../BotConfig';
import Command from './Command';
import DiscordUtil from '../util/DiscordUtil';
import TaskScheduler from '../tasks/TaskScheduler';
import RemovePendingVerificationTask from '../tasks/RemovePendingVerificationTask';

export default class VerifyCommand extends PrefixCommand {
	public readonly aliases = ['verify'];

	public async run( message: Message, args: string ): Promise<boolean> {
		if ( args.length ) {
			return false;
		}

		const pendingChannel = await DiscordUtil.getChannel( BotConfig.pendingVerificationChannel );

		if ( pendingChannel instanceof TextChannel ) {

			let foundUser = false;
			
			const allMessages = await pendingChannel.messages.fetch({ limit: 100 })

			allMessages.forEach( async thisMessage => {
				if ( thisMessage.embeds === undefined ) return undefined;
				if ( thisMessage.embeds[0].fields[0].value.replace(/[<>@!]/g, '' ) === message.author.id ) {
					foundUser = true;
				}
			} );

			try {
				const role = await pendingChannel.guild.roles.fetch( BotConfig.verifiedRole );
				const targetUser = message.guild.members.fetch( message.author.id );
				
				if ( (await targetUser).roles.cache.has( role.id ) ) {
					message.reply( 'Your account has already been verified!' )
					message.react( '❌' )
					return false;
				}
			} catch ( error ) {
				Command.logger.error( error )
			}

			if ( foundUser ) {
				message.reply( 'You already have a pending verification request!' )
				message.react( '❌' )
				return false;
			}

		}

		try {
			const userEmbed = new MessageEmbed();
			const token = this.randomString(15, '23456789abcdeghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ');

			userEmbed.setDescription(`In order to verify, please comment the following token on the ticket [${ BotConfig.verificationTicket }](https://bugs.mojang.com/browse/${ BotConfig.verificationTicket }) using your Jira account. Make sure you only have added one comment to the ticket!\n\nToken: **${ token }**`
			);

			message.author.send( userEmbed );

			if ( pendingChannel instanceof TextChannel ) {

				const pendingEmbed = new MessageEmbed()
					.setColor( 'YELLOW' )
					.setAuthor( message.author.tag, message.author.avatarURL() )
					.addField( 'User', message.author, true )
					.addField( 'Token', token, true )
					.setTimestamp( new Date() );

				const internalEmbed = await pendingChannel.send( pendingEmbed ) as Message;

				try {
					TaskScheduler.addOneTimeMessageTask(
						internalEmbed,
						new RemovePendingVerificationTask(),
						BotConfig.verificationInvalidationTime
					);
				} catch ( error ) {
					Command.logger.error( error );
				}
			}

			message.react( '✅' )

		} catch ( error ) {
			Command.logger.error( error )
		}
		return true;
	}

	// https://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
	private randomString(length: number, chars: string) {
		var result = '';
		for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
		return result;
	}

	public asString(): string {
		return '!jira verify';
	}
}
