import { EmbedBuilder, Message } from 'discord.js';
import PrefixCommand from './PrefixCommand.js';
import BotConfig from '../BotConfig.js';

export default class HelpCommand extends PrefixCommand {
	public readonly aliases = ['help'];

	public async run( message: Message ): Promise<boolean> {
		try {
			const embed = new EmbedBuilder();
			embed.setTitle( '<:mojira:821162280905211964> **MojiraBot help** <:mojira:821162280905211964>' )
				.setDescription( `This is a bot that links to a Mojira ticket when its ticket number is mentioned.
					Currently, the following projects are supported: ${ BotConfig.projects.join( ', ' ) }
					To prevent the bot from linking a ticket, preface the ticket number with an exclamation mark.

					This bot is continuously being worked on and this will receive more features in the future.
					It is not possible to invite this bot to other servers yet.
					If you have any issues, feel free to ping violine1101.

					(For help with the bug tracker or this Discord server, use \`!jira tips\`)`.replace( /\t/g, '' ) )
				.addFields( {
					name: 'Bot Commands',
					value: `\`!jira help\` - Sends this message.
					
					\`!jira ping\` - Sends a message to check if the bot is running.
					
					\`!jira search <text>\` - Searches for text and returns the results from the bug tracker.
					
					\`!jira tips\` - Sends helpful info on how to use the bug tracker and this Discord server.`,
				} )
				.setFooter( { text: message.author.tag, iconURL: message.author.avatarURL() ?? undefined } );
			await message.channel.send( { embeds: [embed] } );
		} catch {
			return false;
		}

		if ( message.deletable ) {
			try {
				await message.delete();
			} catch {
				return true;
			}
		}

		return true;
	}

	public asString(): string {
		return '!jira help';
	}
}
