import { ApplicationCommandOptionChoiceData, AutocompleteInteraction, ChatInputCommandInteraction, MessageFlagsBitField, SharedSlashCommand, SlashCommandBuilder, userMention } from 'discord.js';
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
					.addStringOption( option =>
						option.setName( 'user' )
							.setDescription( 'The user to unban.' )
							.setRequired( true )
							.setAutocomplete( true )
					)
			);
	}

	public readonly permissionLevel = PermissionRegistry.ADMIN_PERMISSION;

	public async run( interaction: ChatInputCommandInteraction ): Promise<boolean> {
		const ban = interaction.options.getSubcommand() === 'ban';
		const user = ban ? interaction.options.getUser( 'user', true ).id : interaction.options.getString( 'user', true );

		try {
			if ( ban ) {
				if ( ModmailUtil.ban( user ) ) {
					await interaction.reply( { content: `Banned ${ userMention( user ) } from sending ModMail messages.`, allowedMentions: { parse: [] } } );
				} else {
					await interaction.reply( { content: `${ userMention( user ) } is already banned from sending ModMail messages.`, flags: [MessageFlagsBitField.Flags.Ephemeral] } );
				}
			} else if ( ModmailUtil.unban( user ) ) {
				await interaction.reply( { content: `Unbanned ${ userMention( user ) } from sending ModMail messages.`, allowedMentions: { parse: [] } } );
			} else {
				await interaction.reply( { content: `${ userMention( user ) } isn't banned from sending ModMail messages.`, flags: [MessageFlagsBitField.Flags.Ephemeral] } );
			}
		} catch ( e ) {
			SlashCommand.logger.error( e );
			return false;
		}

		return true;
	}

	public async autocomplete( interaction: AutocompleteInteraction ): Promise<ApplicationCommandOptionChoiceData[]> {
		const search = interaction.options.getFocused().toLowerCase();
		const choices = await Promise.all( ModmailUtil.getBans().map( async id => {
			const user = await interaction.client.users.fetch( id ).catch( () => undefined );
			return { name: user ? `@${ user.username } (${ id })` : id, value: id };
		} ) );

		return choices
			.filter( choice => choice.name.toLowerCase().includes( search ) )
			.slice( 0, 25 );
	}
}
