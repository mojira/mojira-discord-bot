import { Message, MessageEmbed } from 'discord.js';
import Command from './Command';
import { MentionRegistry } from '../mentions/MentionRegistry';
import BotConfig from '../BotConfig';

export default class MentionCommand extends Command {
	public static get ticketPattern(): string {
		return `(?<ticketid>(?:${ BotConfig.projects.join( '|' ) })-\\d+)`;
	}

	/**
	 * @returns A NEW regex object every time. You have to store it as a variable if you use `exec` on it, otherwise you will encounter infinite loops.
	 */
	public static getTicketIdRegex(): RegExp {
		return new RegExp( `(?<=^|[^${ BotConfig.forbiddenTicketPrefix }])(?<=${ BotConfig.requiredTicketPrefix })(${ MentionCommand.ticketPattern })`, 'g' );
	}

	/**
	 * @returns A NEW regex object every time. You have to store it as a variable if you use `exec` on it, otherwise you will encounter infinite loops.
	 */
	public static getTicketLinkRegex(): RegExp {
		return new RegExp( `https?://bugs\\.mojang\\.com/(?:browse|projects/\\w+/issues)/${ MentionCommand.ticketPattern }`, 'g' );
	}

	public test( messageText: string ): boolean | string[] {

		// replace all issues posted in the form of a link from the search either with a mention or remove them
		if ( !BotConfig.ticketUrlsCauseEmbed || BotConfig.requiredTicketPrefix ) {
			messageText = messageText.replace(
				MentionCommand.getTicketLinkRegex(),
				BotConfig.ticketUrlsCauseEmbed ? `${ BotConfig.requiredTicketPrefix }$1` : ''
			);
		}

		if ( !BotConfig.quotedTicketsCauseEmbed ) {
			messageText = messageText
				.split( '\n' )
				.filter( line => !line.startsWith( '> ' ) )
				.join( '\n' );
		}

		let ticketMatch: RegExpExecArray | null;
		const ticketIdRegex = MentionCommand.getTicketIdRegex();
		const ticketMatches: Set<string> = new Set();

		while ( ( ticketMatch = ticketIdRegex.exec( messageText ) ) !== null ) {
			ticketMatches.add( ticketMatch[1] );
		}

		return ticketMatches.size ? Array.from( ticketMatches ) : false;
	}

	public async run( message: Message, args: string[] ): Promise<boolean> {
		const mention = MentionRegistry.getMention( args );

		let embed: MessageEmbed;
		try {
			embed = await mention.getEmbed();
		} catch ( jiraError ) {
			try {
				Command.logger.info( `Error when retreiving issue information: ${ jiraError.message }` );
				await message.channel.send( `${ message.author } ${ jiraError.message }` );
			} catch ( discordError ) {
				Command.logger.error( discordError );
			}
			return false;
		}

		if ( embed === undefined ) return false;

		embed.setFooter( { text: message.author.tag, iconURL: message.author.avatarURL() ?? undefined } )
			.setTimestamp( message.createdAt );

		try {
			await message.channel.send( { embeds: [embed] } );
		} catch ( err ) {
			Command.logger.error( err );
			return false;
		}

		if ( message.deletable ) {
			const matchesTicketId = message.content.match( new RegExp( `^\\s*${ BotConfig.requiredTicketPrefix }${ MentionCommand.ticketPattern }\\s*$` ) );
			const matchesTicketUrl = message.content.match( new RegExp( `^\\s*https?://bugs.mojang.com/browse/${ MentionCommand.ticketPattern }\\s*$` ) );

			if ( matchesTicketId || ( BotConfig.ticketUrlsCauseEmbed && matchesTicketUrl ) ) {
				try {
					await message.delete();
				} catch ( err ) {
					Command.logger.error( err );
				}
			}
		}

		return true;
	}

	public asString( args: string[] ): string {
		return '[mention] ' + args.join( ', ' );
	}
}
