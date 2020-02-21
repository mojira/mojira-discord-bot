import { Message } from 'discord.js';
import GuildConfig from '../GuildConfig';
import PermissionRegistry from '../permissions/PermissionRegistry';
import Command from './Command';
import PrefixCommand from './PrefixCommand';

export default class ConfigCommand extends PrefixCommand {
	public readonly permissionLevel = PermissionRegistry.MODERATOR_PERMISSION;

	public readonly aliases = ['config', 'setting', 'settings', 'admin', 'option'];

	public async run( message: Message, args: string, config: GuildConfig ): Promise<boolean> {
		const argList = args.split( /\s+/ );

		if ( !args.length || !argList.length ) {
			try {
				await message.channel.send(
					'Current guild config: ```' + config.toString() + '```'
				);
				return true;
			} catch ( err ) {
				Command.logger.error( err );
			}
		} else if ( argList.length === 1 ) {
			if ( config[argList[0]] !== undefined ) {
				try {
					await message.channel.send(
						`Currenty, config \`${ argList[0] }\` is set to \`${ config[argList[0]] }\``
					);
					return true;
				} catch ( err ) {
					Command.logger.error( err );
				}
			} else {
				try {
					await message.channel.send(
						`The config \`${ argList[0] }\` doesn't exist.`
					);
				} catch ( err ) {
					Command.logger.error( err );
				}
			}
		} else if ( argList.length === 2 ) {
			if ( config[argList[0]] !== undefined ) {
				config[argList[0]] = argList[1];
				try {
					await message.channel.send(
						`Set config \`${ argList[0] }\` to \`${ config[argList[0]] }\``
					);
				} catch ( err ) {
					Command.logger.error( err );
				}

				return true;
			} else {
				try {
					await message.channel.send(
						`The config \`${ argList[0] }\` doesn't exist.`
					);
				} catch ( err ) {
					Command.logger.error( err );
				}
			}
		}
		return false;
	}

	public asString( args: string ): string {
		return `!jira config ${ args }`;
	}
}