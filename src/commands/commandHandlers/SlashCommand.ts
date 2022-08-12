import Permission from '../../permissions/Permission.js';
import PermissionRegistry from '../../permissions/PermissionRegistry.js';
import log4js from 'log4js';
import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

export default abstract class SlashCommand {
	public static logger = log4js.getLogger( 'SlashCommandExecutor' );

	public slashCommandBuilder: SlashCommandBuilder = new SlashCommandBuilder();

	public readonly permissionLevel: Permission = PermissionRegistry.ANY_PERMISSION;

	public checkPermission( member: GuildMember ): boolean {
		return this.permissionLevel.checkPermission( member );
	}

	public abstract run( interaction: ChatInputCommandInteraction ): Promise<boolean>;

	public asString( interaction: ChatInputCommandInteraction ): string {
		return interaction.toString();
	}
}
