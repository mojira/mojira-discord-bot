import { Message } from 'discord.js';
import PrefixCommand from './PrefixCommand';
import BotConfig from '../BotConfig';

export default class TipsCommand extends PrefixCommand {
	public readonly aliases = ['tips', 'tutorial'];

	public async run( message: Message ): Promise<boolean> {
		try {
			await message.channel.send(
				`Welcome to the Mojira Discord Server! 
				
				For help using the bug tracker, there is a helpful article on the Minecraft website that you can read: https://help.minecraft.net/hc/en-us/articles/360049840492 
				
				How to use this server: 
				Start by choosing which bug tracker projects you would like to be a part of in #role-selection
				Afterwards, you can use correspondidng request channels in each project to make requests for things on the bug tracker, like resolutions and adding affected versions. 
				The mods and helpers of the bug tracker will then be able to see the requests and resolve them.`.replace( /\t/g, '' )
			);
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
