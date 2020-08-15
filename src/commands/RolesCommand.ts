import { Message, TextChannel, DMChannel, NewsChannel } from 'discord.js';
import PrefixCommand from './PrefixCommand';
import PermissionRegistry from '../permissions/PermissionRegistry';

export default class RolesCommand extends PrefixCommand {
	public readonly permissionLevel = PermissionRegistry.OWNER_PERMISSION;

	public readonly aliases = ['roles'];

	private async sendRolesMessage( channel: TextChannel | DMChannel | NewsChannel ): Promise<boolean> {
		channel.send( 'Sorry, this command is currently disabled!' );

		// const embed = new MessageEmbed();
		// embed.setTitle( 'Please select the project(s) you are interested in, so that we can add you to the appropriate channels.' )
		// 	.setColor( 'AQUA' );

		// for ( const role of BotConfig.roles ) {
		// 	const roleEmoji = MojiraBot.client.emojis.get( role.emoji );
		// 	const textEmoji = ( roleEmoji == undefined ) ? '❓' : roleEmoji.toString();

		// 	embed.addField( textEmoji, role.desc );
		// }

		// let sentMessage: Message | Message[];
		// try {
		// 	sentMessage = await channel.send( embed );
		// } catch ( err ) {
		// 	Command.logger.error( err );
		// 	return false;
		// }

		// if ( sentMessage instanceof Array ) {
		// 	if ( sentMessage.length !== 1 ) {
		// 		Command.logger.error( 'Result of send command was not exactly one message' );
		// 		return false;
		// 	} else {
		// 		sentMessage = sentMessage[0];
		// 	}
		// }

		// ReactionsUtil.reactToMessage( sentMessage as Message, BotConfig.roles.map( role => role.emoji ) );

		return true;
	}

	public async run( message: Message, args: string ): Promise<boolean> {
		if ( args.length ) {
			return false;
		}

		this.sendRolesMessage( message.channel );

		// if ( message.deletable ) {
		// 	try {
		// 		await message.delete();
		// 	} catch ( err ) {
		// 		Command.logger.error( err );
		// 	}
		// }

		return true;
	}

	public asString(): string {
		return '!jira roles';
	}
}