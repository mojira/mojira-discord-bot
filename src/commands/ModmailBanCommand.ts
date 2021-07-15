import { Message } from 'discord.js';
import BotConfig from '../BotConfig';
import PermissionRegistry from '../permissions/PermissionRegistry';
import PrefixCommand from './PrefixCommand';

export default class ModmailBanCommand extends PrefixCommand {
	public readonly permissionLevel = PermissionRegistry.OWNER_PERMISSION;

	public readonly aliases = ['modmailban', 'ban'];

	public async run( message: Message, args: string ): Promise<boolean> {
		BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS modmail_bans (\'user\' varchar)' );

		if ( !args.length ) {
			return false;
		}

		try {
			BotConfig.database.prepare(
				`INSERT INTO modmail_bans (user)
				VALUES (?)`
			).run( args.replace( '!', '' ) );
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
		return `!jira modmailban ${ args.replace( '!', '' ) }`;
	}
}
