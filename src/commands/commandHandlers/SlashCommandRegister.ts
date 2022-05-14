import SlashCommand from './SlashCommand';
import SlashCommandRegistry from './SlashCommandRegistry';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { Client, Collection, CommandInteraction } from 'discord.js';

export default class SlashCommandRegister {
	public static async registerCommands( client: Client, guild: string, token: string ) {
		const commands = [];

		const fetchedGuild = await client.guilds.fetch( guild );

		client.commands = new Collection();

		for ( const commandName in SlashCommandRegistry ) {
			const command = SlashCommandRegistry[commandName] as SlashCommand;

			const JSON = {
				data: command.slashCommandBuilder, async execute( interaction: CommandInteraction ) {
					SlashCommand.logger.info( `User ${ interaction.user.tag } ran command ${ command.asString( interaction ) }` );
					if ( command.checkPermission( await fetchedGuild.members.fetch( interaction.user ) ) ) {
						if ( !await command.run( interaction ) ) {
							await interaction.reply( { content: 'An error occurred while running this command.', ephemeral: true } );
						}
					} else {
						await interaction.reply( { content: 'You do not have permission to use this command.', ephemeral: true } );
					}
				},
			};

			client.commands.set( command.slashCommandBuilder.name, JSON );
			commands.push( JSON.data.toJSON() );
			SlashCommand.logger.info( `Registered command ${ commandName }` );
		}

		const rest = new REST( { version: '9' } ).setToken( token );

		rest.put( Routes.applicationGuildCommands( client.user.id, guild ), { body: commands } )
			.then( () => SlashCommand.logger.info( 'Successfully registered all slash commands.' ) )
			.catch( SlashCommand.logger.error );
	}
}
