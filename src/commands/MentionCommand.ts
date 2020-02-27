import { Message, RichEmbed } from 'discord.js';
import Command from './Command';
import BotConfig from '../BotConfig';
import { Mention } from '../mentions/Mention';
import { MultipleMention } from '../mentions/MultipleMention';
import MentionConfig from '../MentionConfig';
import { CustomMention } from '../mentions/CustomMention';

export default class MentionCommand extends Command<MentionResult> {
	public test( messageText: string ): boolean | MentionResult {
		let unmatchedMessage = messageText;
		let mentions = new Array<Mention>();

		for ( const mentionType of BotConfig.mentionTypes ) {
			const result = this.matchEmbeds( unmatchedMessage, mentionType );
			result.mentions.forEach( v => mentions.push( v ) );
			unmatchedMessage = result.unmatchedMessage;
		}

		if ( mentions.length == 0 ) {
			return false;
		}

		if( BotConfig.maxUngroupedMentions > 0 && mentions.length > BotConfig.maxUngroupedMentions ) {
			const tickets = mentions.map( v => v.getTicket() );
			mentions = [ new MultipleMention( tickets ) ];
		}

		return {
			mentions: mentions,
			unmatchedMessage: unmatchedMessage,
		};
	}

	public async run( message: Message, args: MentionResult ): Promise<boolean> {
		const embeds = new Array<RichEmbed>();

		for( const mention of args.mentions ) {
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

			if( embed === undefined ) return false;

			embed.setFooter( message.author.tag, message.author.avatarURL )
				.setTimestamp( message.createdAt );

			embeds.push( embed );
		}

		let error = false;
		for( const embed of embeds ) {
			try {
				await message.channel.send( embed );
			} catch ( err ) {
				Command.logger.error( err );
				error = true;
			}
		}

		if( error ) return false;

		if ( message.deletable && args.unmatchedMessage !== undefined && args.unmatchedMessage.match( /^\s*$/g ) ) {
			try {
				message.delete();
			} catch ( err ) {
				Command.logger.error( err );
			}
		}

		return true;
	}

	public asString( args: MentionResult ): string {
		const tickets = args.mentions.map( v => v.getTicket() );

		return '[mention] ' + tickets.join( ', ' );
	}

	private matchEmbeds( message: string, mentionType: MentionConfig ): { mentions: Array<Mention>; unmatchedMessage: string } {
		if ( ( mentionType.forbiddenKeyword && message.includes( mentionType.forbiddenKeyword ) )
			|| ( mentionType.requiredKeyword && !message.includes( mentionType.requiredKeyword ) ) ) {
			return { mentions: [], unmatchedMessage: message };
		}

		if( mentionType.requiredKeyword ) {
			message = message.replace( mentionType.requiredKeyword, '' );
		}

		const ticketPatern = `(?:${ BotConfig.projects.join( '|' ) })-\\d+`;
		let ticketRegex: RegExp;

		if ( mentionType.requireUrl ) {
			ticketRegex = RegExp( `https?://bugs.mojang.com/browse/(${ ticketPatern })`, 'g' );
		} else {
			const getPref = ( pref: string ): string => {
				return pref ? pref : '';
			};

			ticketRegex = RegExp( `(?:^|[^${ getPref( mentionType.forbiddenPrefix ) }])${ getPref( mentionType.requiredPrefix ) }(${ ticketPatern })`, 'g' );

			// replace all issues posted in the form of a link from the search either with a mention or remove them
			if ( !mentionType.forbidUrl || mentionType.requiredPrefix ) {
				message = message.replace(
					new RegExp( `https?://bugs.mojang.com/browse/(${ ticketPatern })`, 'g' ),
					mentionType.forbidUrl ? `${ mentionType.requiredPrefix }$1` : ''
				);
			}
		}

		let ticketMatch: RegExpExecArray;
		const ticketMatches = new Array<Mention>();
		let unmatchedMessage = message;

		while ( ( ticketMatch = ticketRegex.exec( message ) ) !== null ) {
			unmatchedMessage = unmatchedMessage.replace( ticketMatch[0], '' );
			ticketMatches.push( new CustomMention( ticketMatch[1], mentionType.embed ) );
		}

		return {
			mentions: ticketMatches,
			unmatchedMessage: unmatchedMessage,
		};
	}
}

interface MentionResult {
	mentions: Array<Mention>;
	unmatchedMessage: string;
}