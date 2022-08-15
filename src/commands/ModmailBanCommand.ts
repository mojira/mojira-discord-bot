import { ChatInputCommandInteraction } from 'discord.js';
import BotConfig from '../BotConfig.js';
import PermissionRegistry from '../permissions/PermissionRegistry.js';
import SlashCommand from './commandHandlers/SlashCommand.js';

export default class ModmailBanCommand extends SlashCommand {
	public readonly slashCommandBuilder = this.slashCommandBuilder
		.setName( 'modmailban' )
		.setDescription( 'Ban a user from using the modmail system.' )
		.addUserOption( option =>
			option.setName( 'user' )
				.setDescription( 'The user to ban.' )
				.setRequired( true )
		);

	public readonly permissionLevel = PermissionRegistry.ADMIN_PERMISSION;

	public async run( interaction: ChatInputCommandInteraction ): Promise<boolean> {

		const args = interaction.options.getUser( 'user', true );

		try {
			BotConfig.database.prepare(
				`INSERT INTO modmail_bans (user)
				VALUES (?)`
			).run( args.id );
		} catch {
			return false;
		}

		try {
			await interaction.reply( `Banned user ${ args.toString() } from ModMail.` );
		} catch {
			return false;
		}

		return true;
	}
}
