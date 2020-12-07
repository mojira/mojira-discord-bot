import { Message, User } from 'discord.js';
import PrefixCommand from './PrefixCommand';
import MentionCommand from './MentionCommand';
import ResolveRequestMessageTask from '../tasks/ResolveRequestMessageTask';
import TaskScheduler from '../tasks/TaskScheduler';
import emojiRegex = require( 'emoji-regex/text.js' );
import { RequestsUtil } from '../util/RequestsUtil';
import BotConfig from '../BotConfig';

export default class BulkCommand extends PrefixCommand {
	public readonly aliases = ['bulk', 'filter'];

	public static currentBulkReactions: Map<User, Message[]>;

	public async run( message: Message, args: string ): Promise<boolean> {
		let rawEmoji: string;

		if ( args.length ) {
			const customEmoji = /^<a?:(\w+):(\d+)>/;
			const unicodeEmoji = emojiRegex();

			if ( customEmoji.test( args ) || unicodeEmoji.test( args ) ) {
				rawEmoji = args;
				const emojiMatch = customEmoji.exec( args );
				if ( emojiMatch ) {
					rawEmoji = emojiMatch[2];
				}
			} else {
				await message.channel.send( `**Error:** ${ args } is not a valid emoji.` );
				return false;
			}
		}

		let ticketKeys: string[];
		let firstMentioned: string;

		try {
			const bulkMessages = BulkCommand.currentBulkReactions.get( message.author );
			let originMessages: Message[];
			for ( const bulk of bulkMessages ) {
				originMessages.push( await RequestsUtil.getOriginMessage( bulk ) );
				await bulk.reactions.cache.get( BotConfig.request.bulkEmoji ).users.remove( message.author );
			}
			originMessages.forEach( origin => ticketKeys.push( ...this.getTickets( origin.content ) ) );
			firstMentioned = ticketKeys[0];
			if ( rawEmoji ) {
				bulkMessages.forEach( resolvable => TaskScheduler.addOneTimeMessageTask(
					resolvable,
					new ResolveRequestMessageTask( rawEmoji, message.author ),
					BotConfig.request.resolveDelay || 0
				) );
			}
			BulkCommand.currentBulkReactions.delete( message.author );
		} catch {
			return false;
		}

		const filter = `https://bugs.mojang.com/browse/${ firstMentioned }?jql=key%20in(${ ticketKeys.join( '%2C' ) })`;

		try {
			await message.channel.send( `${ message.author.toString() } ${ filter }` );
		} catch {
			return false;
		}

		return true;
	}

	private getTickets( content: string ): string[] {
		let ticketMatch: RegExpExecArray;
		const regex = MentionCommand.getTicketIdRegex();
		const ticketMatches: string[] = [];
		while ( ( ticketMatch = regex.exec( content ) ) !== null ) {
			ticketMatches.push( ticketMatch[1] );
		}
		return ticketMatches;
	}

	public asString( args: string ): string {
		return `!jira bulk ${ args }`;
	}
}
