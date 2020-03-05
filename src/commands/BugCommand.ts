import { Message } from 'discord.js';
import Command from './Command';
import PrefixCommand from './PrefixCommand';
import BotConfig from '../BotConfig';
import MentionUtil from '../util/MentionUtil';

export default class BugCommand extends PrefixCommand {
	public readonly aliases = ['bug', 'bugs', 'mention'];

	public async run( message: Message, args: string ): Promise<boolean> {
		const tickets = args.split( /\s+/ig );

		const ticketRegex = new RegExp( `\\s*(${ MentionUtil.ticketPattern })\\s*` );

		for ( const ticket of tickets ) {
			if ( !ticketRegex.test( ticket ) ) {
				try {
					message.channel.send( `'${ ticket }' is not a valid ticket ID.` );
				} catch ( err ) {
					Command.logger.log( err );
				}
				return false;
			}
		}

		const mentions = MentionUtil.getMentions( tickets, BotConfig.defaultEmbed );
		const success = await MentionUtil.sendMentions( mentions, message.channel, { text: message.author.tag, icon: message.author.avatarURL, timestamp: message.createdAt } );

		if( !success ) return false;

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
		return '!jira mention ' + args;
	}
}