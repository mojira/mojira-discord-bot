import Command from './Command.js';
import { Message } from 'discord.js';
import DefaultCommandRegistry from './DefaultCommandRegistry.js';
import DiscordUtil from '../../util/DiscordUtil.js';

export default class CommandExecutor {
	public static async checkCommands( message: Message ): Promise<boolean> {
		for ( const commandName in DefaultCommandRegistry ) {
			const command = DefaultCommandRegistry[commandName] as Command;

			if ( message.member && command.checkPermission( message.member ) ) {
				const commandTestResult = command.test( message.content );

				if ( commandTestResult === false ) continue;

				const args = commandTestResult === true ? '' : commandTestResult;

				Command.logger.info(
					`User ${ DiscordUtil.getUserHandle( message.author ) } ran command ${ command.asString( args ) }`
				);
				return await command.run( message, args );
			}
		}

		return false;
	}
}
