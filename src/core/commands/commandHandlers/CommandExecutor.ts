import Command from './Command.js';
import { Message } from 'discord.js';
import MentionCommand from '../../../modules/mentions/MentionCommand.js';

export default class CommandExecutor {
	private static readonly commands: Command[] = [ new MentionCommand() ];

	public static async checkCommands( message: Message ): Promise<boolean> {
		for ( const command of this.commands ) {
			if ( message.member && command.checkPermission( message.member ) ) {
				const commandTestResult = command.test( message.content );

				if ( commandTestResult === false ) continue;

				const args = commandTestResult === true ? [] : commandTestResult;

				Command.logger.info( `User ${ message.author.tag } ran command ${ command.asString( args ) }` );
				return await command.run( message, args );
			}
		}

		return false;
	}
}
