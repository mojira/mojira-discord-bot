import { Message, MessageEmbed, User } from 'discord.js';
import PrefixCommand from './PrefixCommand';
import MojiraBot from '../MojiraBot';
import BotConfig from '../BotConfig';

export default class VerifyCommand extends PrefixCommand {
	public readonly aliases = ['verify', 'link'];

	public async run( message: Message, args: string ): Promise<boolean> {
		if ( args.length ) {
			return false;
		}

		try {
			const allComments = new Map<string, string>();
			const embed = new MessageEmbed();
			const token = this.randomString(15, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
			embed.setDescription(
				`In order to verify, please comment the following token on the ticket ${ BotConfig.verificationTicket } using your Jira account.\n\nToken: ${ token }`
			)
			const comments = await MojiraBot.jira.issueComments.getComments( { issueIdOrKey: BotConfig.verificationTicket } );
			message.author.send( embed );
			for ( const comment of comments.comments ) {
				allComments.set(comment.author.name, comment.body);
			}
		} catch (e) {
			console.log(e);
		}
		return true;
	}

	// https://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
	private randomString(length, chars) {
		var result = '';
		for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
		return result;
	}

	public asString(): string {
		return '!jira verify';
	}
}
