import Permission from '../../permissions/Permission.js';
import PermissionRegistry from '../../permissions/PermissionRegistry.js';
import log4js from 'log4js';
import { ApplicationCommandOptionChoiceData, AutocompleteInteraction, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { SharedSlashCommand } from '@discordjs/builders';

export default abstract class SlashCommand {
	public static logger = log4js.getLogger( 'SlashCommandExecutor' );

	public abstract build(): SharedSlashCommand;

	public readonly permissionLevel: Permission = PermissionRegistry.ANY_PERMISSION;

	public checkPermission( member: GuildMember ): boolean {
		return this.permissionLevel.checkPermission( member );
	}

	public abstract run( interaction: ChatInputCommandInteraction ): Promise<boolean>;

	/**
	 * Suggests values for the options that have autocomplete enabled
	 */
	public autocomplete?( interaction: AutocompleteInteraction ): Promise<ApplicationCommandOptionChoiceData[]>;

	public asString( interaction: ChatInputCommandInteraction ): string {
		return interaction.toString();
	}
}
