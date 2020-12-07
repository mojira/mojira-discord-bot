import { Message } from 'discord.js';
import PrefixCommand from './PrefixCommand';
import MentionCommand from './MentionCommand';
import Command from './Command';
import ResolveRequestMessageTask from '../tasks/ResolveRequestMessageTask';
import TaskScheduler from '../tasks/TaskScheduler';
import { RequestsUtil } from '../util/RequestsUtil';
import { EmojiUtil } from '../util/EmojiUtil';
import BotConfig from '../BotConfig';

export default class BulkCommand extends PrefixCommand {
	public readonly aliases = ['bulk', 'filter'];

	public static currentBulkReactions = new Map<string, Message[]>();

	private emoji: string;

	private ticketKeys: string[];
	private firstMentioned: string;

	public async run( message: Message, args: string ): Promise<boolean> {
		if ( args.length ) {
			this.emoji = EmojiUtil.getEmoji( args );
			if ( !this.emoji ) {
				await message.channel.send( `**Error:** ${ args } is not a valid emoji.` );
				return false;
			}
		}

		try {
			const bulkMessages = BulkCommand.currentBulkReactions.get( message.author.tag );
			let originMessages: Message[];
			for ( const bulk of bulkMessages ) {
				originMessages.push( await RequestsUtil.getOriginMessage( bulk ) );
				await bulk.reactions.cache.get( BotConfig.request.bulkEmoji ).users.remove( message.author );
			}
			originMessages.forEach( origin => this.ticketKeys.push( ...this.getTickets( origin.content ) ) );
			this.firstMentioned = this.ticketKeys[0];
			if ( this.emoji ) {
				bulkMessages.forEach( resolvable => TaskScheduler.addOneTimeMessageTask(
					resolvable,
					new ResolveRequestMessageTask( this.emoji, message.author ),
					BotConfig.request.resolveDelay || 0
				) );
			}
			BulkCommand.currentBulkReactions.delete( message.author.tag );
		} catch {
			return false;
		}

		const filter = `https://bugs.mojang.com/browse/${ this.firstMentioned }?jql=key%20in(${ this.ticketKeys.join( '%2C' ) })`;

		try {
			await message.channel.send( `${ message.author.toString() } ${ filter }` );
		} catch {
			return false;
		}

		if ( message.deletable ) {
			try {
				await message.delete();
			} catch ( err ) {
				Command.logger.error( err );
			}
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
