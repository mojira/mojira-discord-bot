import SlashCommand from './SlashCommand.js';
import SlashCommandRegistry from './SlashCommandRegistry.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { Client, Collection, RESTPostAPIApplicationCommandsJSONBody, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { SlashCommandJsonData } from '../../types/discord.js';
import { ChannelConfigUtil } from '../../util/ChannelConfigUtil.js';

export default class SlashCommandRegister {
	public static async registerCommands( client: Client, token: string ) {
		client.guilds.cache.forEach( async fetchedGuild => {
			await fetchedGuild.fetch();

			const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];

			client.commands = new Collection();

			for ( const commandName in SlashCommandRegistry ) {
				const command = SlashCommandRegistry[commandName] as SlashCommand;

				// FIXME: This stores a function in a map, and could be refactored.
				// E.g. we could only store the `command` here, and move the logic elsewhere. Does that work?
				const jsonData: SlashCommandJsonData = {
					data: command.slashCommandBuilder,
					async execute( interaction: ChatInputCommandInteraction ) {
						SlashCommand.logger.info( `User ${ interaction.user.tag } ran command ${ command.asString( interaction ) }` );

						const member = interaction.member instanceof GuildMember ? interaction.member : await fetchedGuild.members.fetch( interaction.user );

						if ( command.checkPermission( member ) ) {
							if ( interaction.channel !== null && ChannelConfigUtil.commandsDisabled( interaction.channel ) ) {
								await interaction.reply( { content: 'Commands are not allowed in this channel.', ephemeral: true } );
							} else if ( !await command.run( interaction ) ) {
								await interaction.reply( { content: 'An error occurred while running this command.', ephemeral: true } );
							}
						} else {
							await interaction.reply( { content: 'You do not have permission to use this command.', ephemeral: true } );
						}
					},
				};

				client.commands.set( command.slashCommandBuilder.name, jsonData );
				commands.push( jsonData.data.toJSON() );
				SlashCommand.logger.info( `Registered command ${ commandName } for guild '${ fetchedGuild.name }'` );
			}

			const rest = new REST( { version: '9' } ).setToken( token );

			if ( client.user != null ) {
				rest.put( Routes.applicationGuildCommands( client.user.id, fetchedGuild.id ), { body: commands } )
					.then( () => SlashCommand.logger.info( `Successfully registered all slash commands for guild '${ fetchedGuild.name }'.` ) )
					.catch( error => SlashCommand.logger.error( `An error occurred while registering slash commands for guild '${ fetchedGuild.name }'`, error ) );
			}
		} );
	}
}
