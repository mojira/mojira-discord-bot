import Command from './Command';
import { Message } from 'discord.js';
import CommandRegistry from './CommandRegistry';

export default class CommandExecutor {
	public static async checkCommands( message: Message ): Promise<boolean> {
		for ( const commandName in CommandRegistry ) {
			const command = CommandRegistry[commandName] as Command<any>;

			if ( command.checkPermission( message.member ) ) {
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