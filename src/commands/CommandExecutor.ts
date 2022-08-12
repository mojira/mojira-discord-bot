import Command from './Command.js';
import { Message } from 'discord.js';
import CommandRegistry from './CommandRegistry.js';

export default class CommandExecutor {
	public static async checkCommands( message: Message ): Promise<boolean> {
		for ( const commandName in CommandRegistry ) {
			const command = CommandRegistry[commandName] as Command;

			if ( message.member && command.checkPermission( message.member ) ) {
				const commandTestResult = command.test( message.content );

				if ( commandTestResult === false ) continue;

				const args = commandTestResult === true ? '' : commandTestResult;

				Command.logger.info( `User ${ message.author.tag } ran command ${ command.asString( args ) }` );
				return await command.run( message, args );
			}
		}

		return false;
	}
}
