import { Message, RichEmbed, TextChannel, DMChannel, GroupDMChannel } from 'discord.js';
import PrefixCommand from './PrefixCommand';
import Command from './Command';
import BotConfig from '../BotConfig';
import { ReactionsUtil } from '../util/ReactionsUtil';
import PermissionRegistry from '../permissions/PermissionRegistry';
import MojiraBot from '../MojiraBot';

export default class RolesCommand extends PrefixCommand {
	public readonly permissionLevel = PermissionRegistry.OWNER_PERMISSION;

	public readonly aliases = ['roles'];

	private async sendRolesMessage( channel: TextChannel | DMChannel | GroupDMChannel ): Promise<boolean> {
		const embed = new RichEmbed();
		embed.setTitle( 'Please select the project(s) you are interested in, so that we can add you to the appropriate channels.' )
			.setColor( 'AQUA' );

		for ( const role of BotConfig.roles ) {
			const roleEmoji = MojiraBot.client.emojis.get( role.emoji );
			const textEmoji = ( roleEmoji == undefined ) ? '❓' : roleEmoji.toString();

			embed.addField( textEmoji, role.desc );
		}

		let sentMessage: Message;
		try {
			sentMessage = await channel.send( embed );
		} catch ( err ) {
			Command.logger.error( err );
			return false;
		}

		ReactionsUtil.reactToMessage( sentMessage, BotConfig.roles.map( role => role.emoji ) );

		return true;
	}

	public async run( message: Message, args: string ): Promise<boolean> {
		if ( args.length ) {
			return false;
		}

		this.sendRolesMessage( message.channel );

		if ( message.deletable ) {
			try {
				await message.delete();
			} catch ( err ) {
				Command.logger.error( err );
			}
		}

		return true;
	}

	public asString(): string {
		return '!jira roles';
	}
}