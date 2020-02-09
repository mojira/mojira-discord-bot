import { Message, RichEmbed } from 'discord.js';
import Command from './Command';
import { MentionRegistry } from '../mentions/MentionRegistry';
import BotConfig from '../BotConfig';

export default class MentionCommand extends Command {
	public test( messageText: string ): boolean | string[] {
		const ticketRegex = RegExp( `(?:^|[^${ BotConfig.forbiddenTicketPrefix }])${ BotConfig.requiredTicketPrefix }(${ this.getTicketPattern() })`, 'g' );

		//remove all issues posted in the form of a link from the search

		if(!BotConfig.ticketUrlsCauseEmbed || BotConfig.requiredTicketPrefix)
			messageText = messageText.replace(
				new RegExp(`https?://bugs.mojang.com/browse/(${this.getTicketPattern()})`, 'g'), //search pattern
				BotConfig.ticketUrlsCauseEmbed ? `${BotConfig.requiredTicketPrefix}$1` : ''); //replace with prefix, if enabled, or nothing if disabled

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

		if ( message.deletable
			&& ( message.content.match( new RegExp(`^\\s*${BotConfig.requiredTicketPrefix}${this.getTicketPattern()}\\s*$`))
			|| ( BotConfig.ticketUrlsCauseEmbed && message.content.match(new RegExp(`^\\s*https?://bugs.mojang.com/browse/${this.getTicketPattern()}\\s*$`))))) {
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

	private getTicketPattern(): string {
		return `(?:${ BotConfig.projects.join( '|' ) })-\\d+`;
	}
}
