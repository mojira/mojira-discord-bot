import SlashCommand from './SlashCommand.js';
import SlashCommandRegistry from './SlashCommandRegistry.js';
import { Client, Collection } from 'discord.js';

export default class SlashCommandRegister {
	/**
	 * Maps and registers commands in every guild, updating changed ones only
	 */
	public static async registerCommands( client: Client ): Promise<void> {
		client.commands = new Collection();
		const commands = Object.values( SlashCommandRegistry ).map( command => {
			const commandData = command.build();
			client.commands.set( commandData.name, command );
			return commandData.toJSON();
		} );

		await Promise.all( client.guilds.cache.map( guild => guild.commands.set( commands )
			.then( () => SlashCommand.logger.info( `Successfully registered all slash commands for guild '${ guild.name }'.` ) )
			.catch( error => SlashCommand.logger.error( `An error occurred while registering slash commands for guild '${ guild.name }'`, error ) ) ) );
	}
}
