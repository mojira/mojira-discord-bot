import SlashCommand from './SlashCommand.js';
import SlashCommandRegistry from './SlashCommandRegistry.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { AutocompleteInteraction, Client, Collection, RESTPostAPIApplicationCommandsJSONBody, ChatInputCommandInteraction, GuildMember, Interaction, MessageFlagsBitField } from 'discord.js';
import { SlashCommandJsonData } from '../../types/discord.js';
import { ChannelConfigUtil } from '../../util/ChannelConfigUtil.js';

export default class SlashCommandRegister {
	public static async registerCommands( client: Client, token: string ) {
		client.guilds.cache.forEach( async fetchedGuild => {
			await fetchedGuild.fetch();

			const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];

			client.commands = new Collection();

			const getMember = async ( interaction: Interaction ) => interaction.member instanceof GuildMember ? interaction.member : await fetchedGuild.members.fetch( interaction.user );

			for ( const [ commandName, command ] of Object.entries( SlashCommandRegistry ) ) {
				const commandData = command.build();

				// FIXME: This stores a function in a map, and could be refactored.
				// E.g. we could only store the `command` here, and move the logic elsewhere. Does that work?
				const jsonData: SlashCommandJsonData = {
					data: commandData,
					async execute( interaction: ChatInputCommandInteraction ) {
						SlashCommand.logger.info( `User ${ interaction.user.tag } ran command ${ command.asString( interaction ) }` );

						if ( command.checkPermission( await getMember( interaction ) ) ) {
							if ( interaction.channel !== null && ChannelConfigUtil.commandsDisabled( interaction.channel ) ) {
								await interaction.reply( { content: 'Commands are not allowed in this channel.', flags: [MessageFlagsBitField.Flags.Ephemeral] } );
							} else if ( !await command.run( interaction ) ) {
								await interaction.reply( { content: 'An error occurred while running this command.', flags: [MessageFlagsBitField.Flags.Ephemeral] } );
							}
						} else {
							await interaction.reply( { content: 'You do not have permission to use this command.', flags: [MessageFlagsBitField.Flags.Ephemeral] } );
						}
					},
					async autocomplete( interaction: AutocompleteInteraction ) {
						const choices = command.checkPermission( await getMember( interaction ) ) ? await command.autocomplete?.( interaction ) : undefined;
						await interaction.respond( choices ?? [] );
					},
				};

				client.commands.set( commandData.name, jsonData );
				commands.push( commandData.toJSON() );
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
