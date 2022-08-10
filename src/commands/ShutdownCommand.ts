import { Message } from 'discord.js';
import MojiraBot from '../MojiraBot.js';
import PrefixCommand from './PrefixCommand.js';
import PermissionRegistry from '../permissions/PermissionRegistry.js';
import Command from './Command.js';

export default class ShutdownCommand extends PrefixCommand {
	public readonly permissionLevel = PermissionRegistry.OWNER_PERMISSION;

	public readonly aliases = ['shutdown', 'stop'];

	public async run( message: Message, args: string ): Promise<boolean> {
		if ( args.length ) {
			return false;
		}

		if ( message.deletable ) {
			try {
				await message.delete();
			} catch ( err ) {
				Command.logger.error( err );
			}
		}

		try {
			await MojiraBot.shutdown();
		} catch {
			return false;
		}

		return true;
	}

	public asString(): string {
		return '!jira shutdown';
	}
}
