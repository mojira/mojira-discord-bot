import { Message } from 'discord.js';
import PrefixCommand from './PrefixCommand';
import Command from './Command';
import ResolveRequestMessageTask from '../tasks/ResolveRequestMessageTask';
import TaskScheduler from '../tasks/TaskScheduler';
import { RequestsUtil } from '../util/RequestsUtil';
import { EmojiUtil } from '../util/EmojiUtil';
import BotConfig from '../BotConfig';

export default class BulkCommand extends PrefixCommand {
	public readonly aliases = ['bulk', 'filter'];

	public static currentBulkReactions = new Map<string, Message[]>();

	public async run( message: Message, args: string ): Promise<boolean> {
		let emoji: string;

		if ( args.length ) {
			emoji = EmojiUtil.getEmoji( args );
			if ( !emoji ) {
				await message.channel.send( `**Error:** ${ args } is not a valid emoji.` );
				return false;
			}
		}

		let ticketKeys: string[] = [];
		let firstMentioned: string;

		try {
			const bulkMessages = BulkCommand.currentBulkReactions.get( message.author.tag );
			let originMessages: Message[] = [];
			if ( bulkMessages ) {
				for ( const bulk of bulkMessages ) {
					originMessages.push( await RequestsUtil.getOriginMessage( bulk ) );
					await bulk.reactions.cache.get( BotConfig.request.bulkEmoji ).users.remove( message.author );
				}
				originMessages.forEach( origin => ticketKeys.push( ...RequestsUtil.getTickets( origin.content ) ) );
				firstMentioned = ticketKeys[0];
				if ( emoji ) {
					bulkMessages.forEach( resolvable => TaskScheduler.addOneTimeMessageTask(
						resolvable,
						new ResolveRequestMessageTask( emoji, message.author ),
						BotConfig.request.resolveDelay || 0
					) );
				}
				BulkCommand.currentBulkReactions.delete( message.author.tag );
			} else {
				return false;
			}
		} catch {
			return false;
		}

		const filter = `https://bugs.mojang.com/browse/${ firstMentioned }?jql=key%20in(${ ticketKeys.join( '%2C' ) })`;

		try {
			const filterMessage = await message.channel.send( `${ message.author.toString() } ${ filter }` );

			const timeout = BotConfig.filterRemovalTimeout;
			if ( timeout ) {
				await filterMessage.delete( { timeout } );
			}
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

	public asString( args: string ): string {
		return `!jira bulk ${ args }`;
	}
}
