import { ApplicationCommandOptionChoiceData, AutocompleteInteraction, BaseInteraction, channelMention, ChatInputCommandInteraction, ContainerBuilder, MessageFlags, PermissionFlagsBits, SharedSlashCommand, SlashCommandBuilder, TextDisplayBuilder, userMention } from 'discord.js';
import ModmailEventHandler from '../events/modmail/ModmailEventHandler.js';
import { ModmailUtil } from '../util/ModmailUtil.js';
import SlashCommand from './commandHandlers/SlashCommand.js';

export default class ModmailCommand extends SlashCommand {
	private readonly modmailEventHandler = new ModmailEventHandler();

	public build(): SharedSlashCommand {
		return new SlashCommandBuilder()
			.setName( 'modmail' )
			.setDescription( 'Manage ModMail.' )
			.setDefaultMemberPermissions( PermissionFlagsBits.ManageMessages )
			.addSubcommand( subcommand =>
				subcommand.setName( 'create' )
					.setDescription( 'Start a new ModMail conversation with someone.' )
					.addUserOption( option =>
						option.setName( 'user' )
							.setDescription( 'The user to start the conversation with.' )
							.setRequired( true )
					)
			)
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

	public async run( interaction: ChatInputCommandInteraction ): Promise<boolean> {
		const subcommand = interaction.options.getSubcommand();

		try {
			if ( subcommand === 'create' ) {
				await this.create( interaction );
			} else if ( !this.canBan( interaction ) ) {
				await interaction.reply( { content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral } );
			} else if ( subcommand === 'ban' ) {
				await this.ban( interaction );
			} else {
				await this.unban( interaction );
			}
		} catch ( e ) {
			SlashCommand.logger.error( e );
			return false;
		}

		return true;
	}

	public async autocomplete( interaction: AutocompleteInteraction ): Promise<ApplicationCommandOptionChoiceData[]> {
		if ( !this.canBan( interaction ) ) return [];

		const search = interaction.options.getFocused().toLowerCase();
		const choices = await Promise.all( ModmailUtil.getBans().map( async id => {
			const user = await interaction.client.users.fetch( id ).catch( () => undefined );
			return { name: user ? `@${ user.username } (${ id })` : id, value: id };
		} ) );

		return choices
			.filter( choice => choice.name.toLowerCase().includes( search ) )
			.slice( 0, 25 );
	}

	private async create( interaction: ChatInputCommandInteraction ): Promise<void> {
		const user = interaction.options.getUser( 'user', true );
		await interaction.deferReply( { flags: MessageFlags.Ephemeral } );

		await ModmailUtil.queue( await user.createDM(), async () => {
			const latest = ModmailUtil.findLatestThread( user.id );
			const content = latest?.status === 'open'
				? `The user ${ user } already has an open conversation in ${ channelMention( latest.thread ) }.`
				: `Send a message in ${ await this.modmailEventHandler.create( user ) } to begin the conversation with ${ user }.`;
			const note = ModmailUtil.isBanned( user.id ) ? ' Note that this user is currently banned from sending ModMail messages.' : '';

			await interaction.editReply( {
				components: [ this.getContainer( content + note ) ],
				flags: MessageFlags.IsComponentsV2,
			} );
		} );
	}

	private async ban( interaction: ChatInputCommandInteraction ): Promise<void> {
		const user = interaction.options.getUser( 'user', true ).id;
		if ( ModmailUtil.ban( user ) ) {
			await this.reply( interaction, `Banned ${ userMention( user ) } from sending ModMail messages.` );
		} else {
			await this.reply( interaction, `${ userMention( user ) } is already banned from sending ModMail messages.`, true );
		}
	}

	private async unban( interaction: ChatInputCommandInteraction ): Promise<void> {
		const user = interaction.options.getString( 'user', true );
		if ( ModmailUtil.unban( user ) ) {
			await this.reply( interaction, `Unbanned ${ userMention( user ) } from sending ModMail messages.` );
		} else {
			await this.reply( interaction, `${ userMention( user ) } isn't banned from sending ModMail messages.`, true );
		}
	}

	private async reply( interaction: ChatInputCommandInteraction, content: string, ephemeral = false ): Promise<void> {
		await interaction.reply( {
			components: [ this.getContainer( content ) ],
			flags: ephemeral ? [ MessageFlags.IsComponentsV2, MessageFlags.Ephemeral ] : MessageFlags.IsComponentsV2,
			allowedMentions: { parse: [] },
		} );
	}

	private getContainer( content: string ): ContainerBuilder {
		return new ContainerBuilder().addTextDisplayComponents( new TextDisplayBuilder().setContent( content ) );
	}

	private canBan( interaction: BaseInteraction ): boolean {
		return interaction.memberPermissions?.has( PermissionFlagsBits.BanMembers ) ?? false;
	}
}
