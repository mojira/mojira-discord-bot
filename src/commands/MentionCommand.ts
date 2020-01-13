import { Message, RichEmbed } from 'discord.js';
import Command from './Command';
import { MentionRegistry } from '../mentions/MentionRegistry';
import BotConfig from '../BotConfig';

export default class MentionCommand extends Command {
	public test( messageText: string ): boolean | string[] {
		const ticketRegex = RegExp( `(?:^|[^!])((?:${ BotConfig.projects.join( '|' ) })-\\d+)`, 'g' );

		let ticketMatch: RegExpExecArray;
		const ticketMatches: Set<string> = new Set();

		while ( ( ticketMatch = ticketRegex.exec( messageText ) ) !== null ) {
			ticketMatches.add( ticketMatch[1] );
		}

		return ticketMatches.size ? Array.from( ticketMatches ) : false;
	}

	public async run( message: Message, args: string[] ): Promise<boolean> {
		const mention = MentionRegistry.getMention( args );

		let embed: RichEmbed;
		try {
			embed = await mention.getEmbed();
		} catch ( err ) {
			try {
				message.channel.send( err );
			} catch ( err ) {
				Command.logger.log( err );
			}
			return false;
		}

		if ( embed === undefined ) return false;

		embed.setFooter( message.author.tag, message.author.avatarURL )
			.setTimestamp( message.createdAt );

		try {
			await message.channel.send( embed );
		} catch ( err ) {
			Command.logger.error( err );
			return false;
		}

		if ( message.deletable && message.content.match( new RegExp( `^\\s*(?:^|[^!])((?:${ BotConfig.projects.join( '|' ) })-\\d+)\\s*$` ) ) ) {
			try {
				message.delete();
			} catch ( err ) {
				Command.logger.error( err );
			}
		}

		return true;
	}

	public asString( args: string[] ): string {
		return '[mention] ' + args.join( ', ' );
	}
}
