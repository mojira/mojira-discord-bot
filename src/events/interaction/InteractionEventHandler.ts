import { Client, Interaction } from 'discord.js';
import EventHandler from '../EventHandler.js';
import SlashCommand from '../../commands/commandHandlers/SlashCommand.js';

export default class InteractionEventHandler implements EventHandler<'interactionCreate'> {
	public readonly eventName = 'interactionCreate';

	private readonly botUser: Client;

	constructor( botUser: Client ) {
		this.botUser = botUser;
	}

	// This syntax is used to ensure that `this` refers to the `InteractionEventHandler` object
	public onEvent = async ( interaction: Interaction ): Promise<void> => {
		// Execute commands
		if ( interaction.isChatInputCommand() ) {
			const command = this.botUser.commands.get( interaction.commandName );

			if ( !command ) return;

			try {
				await command.execute( interaction );
			} catch ( error ) {
				SlashCommand.logger.error( error );
			}
		}
	};
}
