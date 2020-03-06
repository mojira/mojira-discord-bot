import { Message } from 'discord.js';
import Command from './Command';
import BotConfig from '../BotConfig';
import Mention from '../mentions/Mention';
import MultipleMention from '../mentions/MultipleMention';
import MentionConfig from '../MentionConfig';
import CustomMention from '../mentions/CustomMention';
import MentionUtil from '../util/MentionUtil';
import SingleMention from '../mentions/SingleMention';

export default class MentionCommand extends Command<MentionArguments> {

	public test( messageText: string ): boolean | MentionArguments {
		const matches = new Array<string[]>();
		const mentions = new Map<string, SingleMention[]>();

		for ( const mentionType of BotConfig.mentionTypes ) {
			const result = this.matchEmbeds( messageText, mentionType );

			if ( result.mentions.length ) {
				result.mentions.forEach( v => {
					let ticketMentions: SingleMention[];

					if( mentions.has( v.getTicket() ) ) {
						ticketMentions = mentions.get( v.getTicket() );
					} else {
						ticketMentions = new Array<SingleMention>();
						mentions.set( v.getTicket(), ticketMentions );
					}

					ticketMentions.push( v );
				} );
				matches.push( result.matches );
			}
		}

		if ( mentions.size == 0 ) {
			return false;
		}

		return { mentions, matches };
	}

	public async run( message: Message, args: MentionArguments ): Promise<boolean> {

		let mentions = new Array<Mention>();
		let group = false;

		for( const ticketMentions of args.mentions.values() ) {
			let found = false;

			for( const mention of ticketMentions ) {
				if ( !mention.maxUngroupedMentions || args.mentions.size <= mention.maxUngroupedMentions ) {
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
			mentions = [ new MultipleMention( Array.from( args.mentions.keys() ) ) ];
		}

		const success = await MentionUtil.sendMentions( mentions, message.channel, { text: message.author.tag, icon: message.author.avatarURL, timestamp: message.createdAt } );

		if( !success ) return false;

		let unmatchedMessage = message.content;
		for ( const match of args.matches ) {
			if( match[ 'keyword' ] ) {
				unmatchedMessage = unmatchedMessage.replace( match[ 'keyword' ], '' );
			}

			for( const m of match ) {
				unmatchedMessage = unmatchedMessage.replace( m, '' );
			}
		}

		if ( message.deletable && unmatchedMessage.match( /^\s*$/g ) ) {
			try {
				message.delete();
			} catch ( err ) {
				Command.logger.error( err );
			}
		}

		return true;
	}

	public asString( args: MentionArguments ): string {
		const matches = args.matches.map( match => `${ match[ 'keyword' ] ? match[ 'keyword' ] : '' } (${ match.join( ', ' ) })` );

		return '[mention] ' + matches.join( ', ' );
	}

	private matchEmbeds( message: string, mentionType: MentionConfig ): { mentions: SingleMention[]; matches: string[] } {
		if ( ( mentionType.forbiddenKeyword && message.includes( mentionType.forbiddenKeyword ) )
			|| ( mentionType.requiredKeyword && !message.includes( mentionType.requiredKeyword ) ) ) {
			return { mentions: [], matches: [] };
		}

		const matches = new Array<string>();
		if( mentionType.requiredKeyword ) {
			matches[ 'keyword' ] = mentionType.requiredKeyword;
		}

		let prefixPattern = `(?<=^|[^${ mentionType.forbiddenPrefix || '' }])${ mentionType.requiredPrefix || '' }`;

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
			matches.push( ticketMatch[ 0 ] );
			ticketMatches.add( new CustomMention( ticketMatch[ 1 ].toUpperCase(), mentionType.embed, mentionType.maxUngroupedMentions ) );
		}

		return {
			mentions: Array.from( ticketMatches ),
			matches,
		};
	}
}

interface MentionArguments {
	mentions: Map<string, SingleMention[]>;
	matches: string[][];
}