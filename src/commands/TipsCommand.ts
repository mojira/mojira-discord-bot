import { EmbedBuilder, Message } from 'discord.js';
import DiscordUtil from '../util/DiscordUtil.js';
import PrefixCommand from './PrefixCommand.js';

export default class TipsCommand extends PrefixCommand {
	public readonly aliases = ['tips', 'tutorial'];

	public async run( message: Message ): Promise<boolean> {
		try {
			const embed = new EmbedBuilder();
			embed.setDescription( `__Welcome to the Mojira Discord Server!__
				
				For help with using the bug tracker, there is an article on the Minecraft website that you can read: <https://aka.ms/MCBugTrackerHelp>.
				
				How to use this server: 
				Start by choosing which bug tracker projects you would like to be a part of in <#648479533246316555>.
				Afterwards, you can use corresponding request channels in each project to make requests for changes to tickets on the bug tracker, like resolutions and adding affected versions. 
				The moderators and helpers of the bug tracker will then be able to see the requests and resolve them.`.replace( /\t/g, '' ) )
				.setFooter( { text: message.author.tag, iconURL: message.author.avatarURL() ?? undefined } );
			await DiscordUtil.sendMentionMessage( message, { embeds: [embed] } );
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
		return '!jira tips';
	}
}
