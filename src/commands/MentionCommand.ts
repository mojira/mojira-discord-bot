import { Message } from 'discord.js';
import Command from './Command';
import BotConfig from '../BotConfig';
import { Mention } from '../mentions/Mention';
import { MultipleMention } from '../mentions/MultipleMention';
import MentionConfig from '../MentionConfig';
import { CustomMention } from '../mentions/CustomMention';
import MentionUtil from '../util/MentionUtil';
import SingleMention from '../mentions/SingleMention';

export default class MentionCommand extends Command<MentionArguments> {

	public test( messageText: string ): boolean | MentionArguments {
		let unmatchedMessage = messageText;
		const foundMentions = new Map<string, SingleMention[]>();

		for ( const mentionType of BotConfig.mentionTypes ) {
			const result = this.matchEmbeds( messageText, unmatchedMessage, mentionType );
			result.mentions.forEach( v => {
				let ticketMentions: SingleMention[];

				if( foundMentions.has( v.getTicket() ) ) {
					ticketMentions = foundMentions.get( v.getTicket() );
				} else {
					ticketMentions = new Array<SingleMention>();
					foundMentions.set( v.getTicket(), ticketMentions );
				}

				ticketMentions.push( v );
			} );
			unmatchedMessage = result.unmatchedMessage;
		}

		if ( foundMentions.size == 0 ) {
			return false;
		}

		let mentions = new Array<Mention>();
		let group = false;

		for( const ticketMentions of foundMentions.values() ) {
			let found = false;

			for( const mention of ticketMentions ) {
				if ( !mention.maxUngroupedMentions || foundMentions.size <= mention.maxUngroupedMentions ) {
					mentions.push( mention );
					found = true;
					break;
				}
			}
			if( !found ) {
				group = true;
				break;
			}
		}

		if( group ) {
			mentions = [ new MultipleMention( Array.from( foundMentions.keys() ) ) ];
		}

		return {
			mentions: mentions,
			unmatchedMessage: unmatchedMessage,
		};
	}

	public async run( message: Message, args: MentionArguments ): Promise<boolean> {
		const success = await MentionUtil.sendMentions( args.mentions, message.channel, { text: message.author.tag, icon: message.author.avatarURL, timestamp: message.createdAt } );

		if( !success ) return false;

		if ( message.deletable && args.unmatchedMessage !== undefined && args.unmatchedMessage.match( /^\s*$/g ) ) {
			try {
				message.delete();
			} catch ( err ) {
				Command.logger.error( err );
			}
		}

		return true;
	}

	public asString( args: MentionArguments ): string {
		const tickets = args.mentions.map( v => v.getTicket() );

		return '[mention] ' + tickets.join( ', ' );
	}

	private matchEmbeds( message: string, unmatchedMessage: string, mentionType: MentionConfig ): { mentions: Array<SingleMention>; unmatchedMessage: string } {
		if ( ( mentionType.forbiddenKeyword && message.includes( mentionType.forbiddenKeyword ) )
			|| ( mentionType.requiredKeyword && !message.includes( mentionType.requiredKeyword ) ) ) {
			return { mentions: [], unmatchedMessage };
		}

		if( mentionType.requiredKeyword ) {
			unmatchedMessage = unmatchedMessage.replace( mentionType.requiredKeyword, '' );
		}

		const getDefinedStr = ( str: string ): string => {
			return str ? str : '';
		};

		let prefixPattern = `(?<=^|[^${ getDefinedStr( mentionType.forbiddenPrefix ) }])${ getDefinedStr( mentionType.requiredPrefix ) }`;

		if ( mentionType.forbidUrl ) {
			prefixPattern += `(?<!${ MentionUtil.linkPattern })`;
		} else if ( mentionType.requireUrl ) {
			prefixPattern += MentionUtil.linkPattern;
		} else {
			// This is needed to include urls in the entire match when they are optional so that they get removed from the unmatchedMessage
			prefixPattern += `(?:${ MentionUtil.linkPattern }|)`;
		}

		const ticketRegex = RegExp( `${ prefixPattern }(${ MentionUtil.ticketPattern })`, 'gi' );

		let ticketMatch: RegExpExecArray;
		const ticketMatches = new Set<SingleMention>();

		while ( ( ticketMatch = ticketRegex.exec( message ) ) !== null ) {
			unmatchedMessage = unmatchedMessage.replace( ticketMatch[0], '' );
			ticketMatches.add( new CustomMention( ticketMatch[1].toUpperCase(), mentionType.embed, mentionType.maxUngroupedMentions ) );
		}

		return {
			mentions: Array.from( ticketMatches ),
			unmatchedMessage,
		};
	}
}

interface MentionArguments {
	mentions: Array<Mention>;
	unmatchedMessage: string;
}