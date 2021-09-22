import { Message, MessageEmbed } from 'discord.js';
import PrefixCommand from './PrefixCommand';

export default class TipsCommand extends PrefixCommand {
	public readonly aliases = ['tips', 'tutorial'];

	public async run( message: Message ): Promise<boolean> {
		try {
			const embed = new MessageEmbed();
			embed.setDescription( `__Welcome to the Mojira Discord Server!__
				
				For help with using the bug tracker, there is an article on the Minecraft website that you can read: <https://help.minecraft.net/hc/articles/360049840492>.
				
				How to use this server: 
				Start by choosing which bug tracker projects you would like to be a part of in <#648479533246316555>.
				Afterwards, you can use corresponding request channels in each project to make requests for changes to tickets on the bug tracker, like resolutions and adding affected versions. 
				The moderators and helpers of the bug tracker will then be able to see the requests and resolve them.`.replace( /\t/g, '' ) )
				.setFooter( message.author.tag, message.author.avatarURL() );
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
		return '!jira tips';
	}
}
