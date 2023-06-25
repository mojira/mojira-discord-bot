import { ChatInputCommandInteraction } from 'discord.js';
import BotConfig from '../BotConfig.js';
import PermissionRegistry from '../permissions/PermissionRegistry.js';
import SlashCommand from './commandHandlers/SlashCommand.js';

export default class ModmailUnbanCommand extends SlashCommand {
	public readonly slashCommandBuilder = this.slashCommandBuilder
		.setName( 'modmailunban' )
		.setDescription( 'Unbans a user from using the modmail system.' )
		.addUserOption( option =>
			option.setName( 'user' )
				.setDescription( 'The user to unban.' )
				.setRequired( true )
		);

	public readonly permissionLevel = PermissionRegistry.ADMIN_PERMISSION;

	public async run( interaction: ChatInputCommandInteraction ): Promise<boolean> {

		const args = interaction.options.getUser( 'user', true );

		try {
			const unban = BotConfig.database.prepare(
				`DELETE FROM modmail_bans
				WHERE user = ?`
			).run( args.id );
			if ( unban.changes == 0 ) {
				await interaction.reply( { content: 'User was never banned.', ephemeral: true } );

				return true;
			}
		} catch {
			return false;
		}

		try {
			await interaction.reply( `${ args.toString() } has been unbanned from using modmail` );
		} catch {
			return false;
		}

		return true;
	}
}
