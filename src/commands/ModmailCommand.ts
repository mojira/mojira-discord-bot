import { ChatInputCommandInteraction, MessageFlagsBitField, SharedSlashCommand, SlashCommandBuilder } from 'discord.js';
import PermissionRegistry from '../permissions/PermissionRegistry.js';
import { ModmailUtil } from '../util/ModmailUtil.js';
import SlashCommand from './commandHandlers/SlashCommand.js';

export default class ModmailCommand extends SlashCommand {
	public build(): SharedSlashCommand {
		return new SlashCommandBuilder()
			.setName( 'modmail' )
			.setDescription( 'Manage ModMail.' )
			.addSubcommand( subcommand =>
				subcommand.setName( 'ban' )
					.setDescription( 'Ban someone from sending ModMail messages.' )
					.addUserOption( option =>
						option.setName( 'user' )
							.setDescription( 'The user to ban.' )
							.setRequired( true )
					)
			)
			.addSubcommand( subcommand =>
				subcommand.setName( 'unban' )
					.setDescription( 'Unban someone from sending ModMail messages.' )
					.addUserOption( option =>
						option.setName( 'user' )
							.setDescription( 'The user to unban.' )
							.setRequired( true )
					)
			);
	}

	public readonly permissionLevel = PermissionRegistry.ADMIN_PERMISSION;

	public async run( interaction: ChatInputCommandInteraction ): Promise<boolean> {
		const user = interaction.options.getUser( 'user', true );

		try {
			if ( interaction.options.getSubcommand() === 'ban' ) {
				if ( ModmailUtil.ban( user.id ) ) {
					await interaction.reply( { content: `Banned ${ user } from sending ModMail messages.`, allowedMentions: { parse: [] } } );
				} else {
					await interaction.reply( { content: `${ user } is already banned from sending ModMail messages.`, flags: [MessageFlagsBitField.Flags.Ephemeral] } );
				}
			} else if ( ModmailUtil.unban( user.id ) ) {
				await interaction.reply( { content: `Unbanned ${ user } from sending ModMail messages.`, allowedMentions: { parse: [] } } );
			} else {
				await interaction.reply( { content: `${ user } isn't banned from sending ModMail messages.`, flags: [MessageFlagsBitField.Flags.Ephemeral] } );
			}
		} catch ( e ) {
			SlashCommand.logger.error( e );
			return false;
		}

		return true;
	}
}
