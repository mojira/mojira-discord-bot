import { AutocompleteInteraction, ChatInputCommandInteraction, Client, Interaction, MessageFlagsBitField } from 'discord.js';
import BotConfig from '../BotConfig.js';
import EventHandler from './EventHandler.js';
import ModmailEventHandler from '../../modules/modmail/events/ModmailEventHandler.js';
import SlashCommand from '../commands/commandHandlers/SlashCommand.js';
import { ChannelConfigUtil } from '../../util/ChannelConfigUtil.js';

export default class InteractionEventHandler implements EventHandler<'interactionCreate'> {
	public readonly eventName = 'interactionCreate';

	private readonly botUser: Client;

	private readonly modmailEventHandler = new ModmailEventHandler();

	constructor( botUser: Client ) {
		this.botUser = botUser;
	}

	// This syntax is used to ensure that `this` refers to the `InteractionEventHandler` object
	public onEvent = async ( interaction: Interaction ): Promise<void> => {
		// Execute commands
		if ( interaction.isChatInputCommand() ) {
			const command = this.botUser.commands.get( interaction.commandName );

			if ( !command || !interaction.inCachedGuild() ) return;

			try {
				await this.runCommand( command, interaction );
			} catch ( error ) {
				SlashCommand.logger.error( error );
			}
		} else if ( interaction.isAutocomplete() ) {
			const command = this.botUser.commands.get( interaction.commandName );

			if ( !command || !interaction.inCachedGuild() ) return;

			try {
				await this.autocompleteCommand( command, interaction );
			} catch ( error ) {
				SlashCommand.logger.error( error );
			}
		} else if ( interaction.isButton() && BotConfig.modmailEnabled ) {
			// The button might belong to a modmail prompt
			await this.modmailEventHandler.onButton( interaction );
		}
	};

	/**
	 * Runs command if member may use it in this channel, replying with error otherwise
	 */
	private async runCommand( command: SlashCommand, interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		SlashCommand.logger.info( `User ${ interaction.user.tag } ran command ${ command.asString( interaction ) }` );

		if ( command.checkPermission( interaction.member ) ) {
			if ( interaction.channel !== null && ChannelConfigUtil.commandsDisabled( interaction.channel ) ) {
				await interaction.reply( { content: 'Commands are not allowed in this channel.', flags: [MessageFlagsBitField.Flags.Ephemeral] } );
			} else if ( !await command.run( interaction ) ) {
				const error = 'An error occurred while running this command.';
				await ( interaction.deferred ? interaction.editReply( error ) : interaction.reply( { content: error, flags: [MessageFlagsBitField.Flags.Ephemeral] } ) );
			}
		} else {
			await interaction.reply( { content: 'You do not have permission to use this command.', flags: [MessageFlagsBitField.Flags.Ephemeral] } );
		}
	}

	/**
	 * Responds with command's suggestions if member may use it, otherwise with none
	 */
	private async autocompleteCommand( command: SlashCommand, interaction: AutocompleteInteraction<'cached'> ): Promise<void> {
		const choices = command.checkPermission( interaction.member ) ? await command.autocomplete?.( interaction ) : undefined;
		await interaction.respond( choices ?? [] );
	}
}
