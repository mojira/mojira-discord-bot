import { CommandInteraction } from 'discord.js';
import MojiraBot from '../MojiraBot';
import PermissionRegistry from '../permissions/PermissionRegistry';
import SlashCommand from './commandHandlers/SlashCommand';

export default class ShutdownCommand extends SlashCommand {
	public readonly slashCommandBuilder = this.slashCommandBuilder
		.setName( 'shutdown' )
		.setDescription( 'Shutdown MojiraBot.' )

	public readonly permissionLevel = PermissionRegistry.OWNER_PERMISSION;

	public async run( interaction: CommandInteraction ): Promise<boolean> {
		try {
			await interaction.reply( { content: 'Shutting down MojiraBot...' } );
			await MojiraBot.shutdown();
		} catch {
			return false;
		}

		return true;
	}
}
