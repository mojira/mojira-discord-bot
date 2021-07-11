import { Message } from 'discord.js';
import BotConfig from '../BotConfig';
import PermissionRegistry from '../permissions/PermissionRegistry';
import PrefixCommand from './PrefixCommand';

export default class ModmailUnbanCommand extends PrefixCommand {
	public readonly permissionLevel = PermissionRegistry.OWNER_PERMISSION;

	public readonly aliases = ['modmailunban', 'unban'];

	public async run( message: Message, args: string ): Promise<boolean> {
		BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS modmail_bans (\'user\' varchar)' );

		if ( !args.length ) {
			return false;
		}

		try {
			const unban = BotConfig.database.prepare(
				`DELETE FROM modmail_bans
				WHERE user = ?`
			).run( args );
			if ( unban.changes == 0 ) {
				await message.channel.send( 'User was never banned.' );

				await message.react( '☑️' );

				return true;
			}
		} catch {
			return false;
		}

		try {
			await message.react( '✅' );
		} catch {
			return false;
		}

		return true;
	}

	public asString( args: string ): string {
		return `!jira modmailunban ${ args }`;
	}
}
