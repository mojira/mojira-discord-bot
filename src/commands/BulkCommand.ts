import { Message, TextChannel } from 'discord.js';
import PrefixCommand from './PrefixCommand';
import MentionCommand from './MentionCommand';
import Command from './Command';
import DiscordUtil from '../util/DiscordUtil';
import BotConfig from '../BotConfig';

export default class BulkCommand extends PrefixCommand {
	public readonly aliases = ['bulk', 'filter'];

	public async run( message: Message, args: string ): Promise<boolean> {
		if ( args.length ) {
			return false;
		}

		let bulkMessages: Set<Message>;

		for ( let i = 0; i < BotConfig.request.internalChannels.length; i++ ) {
			const internalChannelId = BotConfig.request.internalChannels[i];
			try {
				const internalChannel = await DiscordUtil.getChannel( internalChannelId );
				if ( internalChannel instanceof TextChannel ) {
					const channelMessages = internalChannel.messages.cache.values();
					for await ( const channelMessage of channelMessages ) {
						const reaction = channelMessage.reactions.cache.get( BotConfig.request.bulkEmoji );
						if ( reaction.users.cache.get( message.author.id ) ) {
							bulkMessages.add( channelMessage );
						}
					}
				}
			} catch ( err ) {
				Command.logger.error( err );
				return false;
			}
		}

		const bulkMessageArray = Array.from( bulkMessages );

		let firstMentioned: string;
		let ticketKeys: string[];

		try {
			for ( let j = 0; j < bulkMessageArray.length; j++ ) {
				const bulkMessage = bulkMessageArray[j];
				const ticket = Array.from( this.getTickets( bulkMessage.toString() ) );
				if ( firstMentioned == null ) {
					firstMentioned = ticket[1];
				}
				ticket.forEach( key => ticketKeys.push( key ) );
				const reaction = bulkMessage.reactions.cache.get( BotConfig.request.bulkEmoji );
				await reaction.users.remove( message.author.id );
			}
		} catch ( err ) {
			Command.logger.error( err );
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

	private getTickets( content: string ): Set<string> {
		let ticketMatch: RegExpExecArray;
		const regex = MentionCommand.getTicketIdRegex();
		const ticketMatches: Set<string> = new Set();
		while ( ( ticketMatch = regex.exec( content ) ) !== null ) {
			ticketMatches.add( ticketMatch[1] );
		}
		return ticketMatches;
	}

	public asString(): string {
		return '!jira bulk';
	}
}
