import { Message, MessageEmbed } from 'discord.js';
import Command from './Command';
import PrefixCommand from './PrefixCommand';
import { MentionRegistry } from '../mentions/MentionRegistry';
import BotConfig from '../BotConfig';

export default class BugCommand extends PrefixCommand {
	public readonly aliases = ['bug', 'bugs', 'mention'];

	public async run( message: Message, args: string ): Promise<boolean> {
		const tickets = args.split( /\s+/ig );

		const ticketRegex = new RegExp( `\\s*((?:${ BotConfig.projects.join( '|' ) })-\\d+)\\s*` );

		for ( const ticket of tickets ) {
			if ( !ticketRegex.test( ticket ) ) {
				try {
					await message.channel.send( `'${ ticket }' is not a valid ticket ID.` );
				} catch ( err ) {
					Command.logger.log( err );
				}
				return false;
			}
		}

		const mention = MentionRegistry.getMention( tickets );

		let embed: MessageEmbed;
		try {
			embed = await mention.getEmbed();
		} catch ( err ) {
			try {
				await message.channel.send( err );
			} catch ( err ) {
				Command.logger.log( err );
			}
			return false;
		}

		if ( embed === undefined ) return false;

		embed.setFooter( message.author.tag, message.author.avatarURL() )
			.setTimestamp( message.createdAt );

		try {
			await message.channel.send( { embeds: [embed] } );
		} catch ( err ) {
			Command.logger.error( err );
			return false;
		}

		if ( message.deletable ) {
			try {
				await message.delete();
			} catch ( err ) {
				Command.logger.error( err );
			}
		} else {
			BugCommand.logger.log( 'message not deletable' );
		}

		return true;
	}

	public asString( args: string ): string {
		return '!jira mention ' + args;
	}
}