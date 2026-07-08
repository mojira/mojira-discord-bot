import { ChatInputCommandInteraction, SharedSlashCommand, SlashCommandBuilder } from 'discord.js';
import MojiraBot from '../MojiraBot.js';
import PermissionRegistry from '../permissions/PermissionRegistry.js';
import SlashCommand from './commandHandlers/SlashCommand.js';

export default class ShutdownCommand extends SlashCommand {
	public build(): SharedSlashCommand {
		return new SlashCommandBuilder()
			.setName( 'shutdown' )
			.setDescription( 'Shutdown MojiraBot.' );
	}

	public readonly permissionLevel = PermissionRegistry.OWNER_PERMISSION;

	public async run( interaction: ChatInputCommandInteraction ): Promise<boolean> {
		try {
			await interaction.reply( { content: 'Shutting down MojiraBot...' } );
			await MojiraBot.shutdown();
		} catch {
			return false;
		}

		return true;
	}
}
