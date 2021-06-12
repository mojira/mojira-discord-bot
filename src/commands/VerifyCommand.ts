import { Message, MessageEmbed, TextChannel } from 'discord.js';
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

		const pendingChannel = await DiscordUtil.getChannel( BotConfig.verification.pendingVerificationChannel );
		const logChannel = await DiscordUtil.getChannel( BotConfig.verification.verificationLogChannel );

		if ( pendingChannel instanceof TextChannel && logChannel instanceof TextChannel ) {

			let foundUser = false;
			let isVerified = false;

			const allMessages = pendingChannel.messages.cache;
			const verifications = logChannel.messages.cache;

			allMessages.forEach( async thisMessage => {
				if ( thisMessage.embeds.length == 0 ) return undefined;
				if ( thisMessage.embeds[0].fields[0].value.replace( /[<>@!]/g, '' ) == message.author.id ) {
					foundUser = true;
				}
			} );

			verifications.forEach( async thisMessage => {
				if ( thisMessage.embeds.length == 0 ) return undefined;
				if ( thisMessage.embeds[0].fields[0].value.replace( /[<>@!]/g, '' ) == message.author.id ) {
					isVerified = true;
				}
			} );

			try {
				const role = await pendingChannel.guild.roles.fetch( BotConfig.verification.verifiedRole );
				const targetUser = await message.guild.members.fetch( message.author.id );

				if ( targetUser.roles.cache.has( role.id ) || isVerified ) {
					await message.channel.send( `${ message.author }, you have already linked your accounts!` );
					await message.react( '❌' );
					return false;
				}
			} catch ( error ) {
				Command.logger.error( error );
			}

			if ( foundUser ) {
				await message.channel.send( `${ message.author }, you already have a pending verification request!` );
				await message.react( '❌' );
				return false;
			}

		}

		try {
			const token = 'DISCORD-VERIFICATION-' + this.randomString( 15, '23456789abcdeghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ' );

			const userEmbed = new MessageEmbed()
				.setDescription( `In order to verify, please comment the following token on the ticket [${ BotConfig.verification.verificationTicket }](https://bugs.mojang.com/browse/${ BotConfig.verification.verificationTicket }) using your Jira account. Make sure you only have added one comment to the ticket!\nAfter you are done, please send \`link <jira-username>\` here and I will verify the account!\n\nToken: **${ token }**` );

			await message.author.send( userEmbed );

			if ( pendingChannel instanceof TextChannel ) {

				const pendingEmbed = new MessageEmbed()
					.setColor( 'YELLOW' )
					.setAuthor( message.author.tag, message.author.avatarURL() )
					.addField( 'User', message.author, true )
					.addField( 'Token', token, true )
					.setFooter( 'Pending verification' )
					.setTimestamp( new Date() );

				const internalEmbed = await pendingChannel.send( pendingEmbed );

				try {
					TaskScheduler.addOneTimeMessageTask(
						internalEmbed,
						new RemovePendingVerificationTask(),
						BotConfig.verification.verificationInvalidationTime
					);
				} catch ( error ) {
					Command.logger.error( error );
				}
			}

			await message.react( '✅' );

		} catch ( error ) {
			Command.logger.error( error );
		}
		return true;
	}

	// https://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
	private randomString( length: number, chars: string ): string {
		let result = '';
		for ( let i = length; i > 0; --i ) result += chars[Math.floor( Math.random() * chars.length )];
		return result;
	}

	public asString(): string {
		return '!jira verify';
	}
}
