import Command from './Command';
import escapeRegex from 'escape-string-regexp';

export default abstract class PrefixCommand extends Command {
	abstract readonly aliases: string[];

	public static prefix = '!jira';

	public test( messageText: string ): boolean | string {
		// TODO: Allow for configuration of prefix
		const prefix = escapeRegex( PrefixCommand.prefix );

		const regex = new RegExp( `^${ prefix }\\s+(\\w+)(?:\\s+((?:.|[\r\n])*))?$` );
		const regexResult = regex.exec( messageText );

		// Check if command is valid
		if ( regexResult && this.aliases.includes( regexResult[1] ) ) {
			// Run command
			return regexResult[2] ? regexResult[2] : true;
		}

		return false;
	}
}
