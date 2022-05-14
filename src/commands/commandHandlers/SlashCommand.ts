import Permission from '../../permissions/Permission';
import PermissionRegistry from '../../permissions/PermissionRegistry';
import * as log4js from 'log4js';
import { CommandInteraction, GuildMember } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

export default abstract class SlashCommand {
	public static logger = log4js.getLogger( 'SlashCommandExecutor' );

	public slashCommandBuilder: SlashCommandBuilder = new SlashCommandBuilder();

	public readonly permissionLevel: Permission = PermissionRegistry.ANY_PERMISSION;

	public checkPermission( member: GuildMember ): boolean {
		return this.permissionLevel.checkPermission( member );
	}

	public abstract run( interaction: CommandInteraction ): Promise<boolean>;

	public asString( interaction: CommandInteraction ): string {
		return interaction.toString();
	}
}
