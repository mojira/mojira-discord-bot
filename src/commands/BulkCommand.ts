import { Message, MessageReaction, User } from 'discord.js';
import PrefixCommand from './PrefixCommand';
import Command from './Command';
import { RequestsUtil } from '../util/RequestsUtil';
import { EmojiUtil } from '../util/EmojiUtil';
import BotConfig from '../BotConfig';
import RequestResolveEventHandler from '../events/request/RequestResolveEventHandler';
import MojiraBot from '../MojiraBot';

export default class BulkCommand extends PrefixCommand {
	public readonly aliases = ['bulk', 'filter'];

	public static currentBulkReactions = new Map<User, Message[]>();

	public async run( message: Message, args: string ): Promise<boolean> {
		let emoji: string;

		if ( args.length ) {
			emoji = EmojiUtil.getEmoji( args );
			if ( !emoji ) {
				await message.channel.send( `**Error:** ${ args } is not a valid emoji.` );
				return false;
			}
		}

		const ticketKeys: string[] = [];
		let firstMentioned: string;

		try {
			const bulkMessages = BulkCommand.currentBulkReactions.get( message.author );
			const originMessages: Message[] = [];
			if ( bulkMessages ) {
				for ( const bulk of bulkMessages ) {
					originMessages.push( await RequestsUtil.getOriginMessage( bulk ) );

					if ( emoji ) {
						let reaction: MessageReaction;
						if ( bulk.reactions.cache.has( emoji ) ) {
							reaction = bulk.reactions.cache.get( emoji );
						} else {
							reaction = await bulk.react( emoji );
						}
						if ( emoji != BotConfig.request.bulkEmoji ) {
							await new RequestResolveEventHandler( MojiraBot.client.user.id ).onEvent( reaction, message.author );
							return true;
						} else {
							await bulk.reactions.cache.get( BotConfig.request.bulkEmoji ).users.remove( message.author );
						}
					}
				}
				originMessages.forEach( origin => ticketKeys.push( ...RequestsUtil.getTickets( origin.content ) ) );
				firstMentioned = ticketKeys[0];
				if ( emoji == BotConfig.request.bulkEmoji ) {
					BulkCommand.currentBulkReactions.delete( message.author );
					return true;
				}
			} else {
				return false;
			}
		} catch ( err ) {
			Command.logger.error( err );
			return false;
		}

		const filter = `https://bugs.mojang.com/browse/${ firstMentioned }?jql=key%20in(${ ticketKeys.join( '%2C' ) })`;

		try {
			await message.channel.send( `${ message.author.toString() } ${ filter }` );
		} catch ( err ) {
			Command.logger.error( err );
			return false;
		}

		try {
			await message.react( '✅' );
		} catch ( err ) {
			Command.logger.error( err );
		}

		return true;
	}

	public asString( args: string ): string {
		return `!jira bulk ${ args }`;
	}
}
