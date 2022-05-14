import { CommandInteraction, Message } from 'discord.js';
import { SingleMention } from '../mentions/SingleMention';
import { ReactionsUtil } from '../util/ReactionsUtil';
import SlashCommand from './commandHandlers/SlashCommand';

export default class MooCommand extends SlashCommand {
	public readonly slashCommandBuilder = this.slashCommandBuilder
		.setName( 'moo' )
		.setDescription( 'Mooooo.' );

	public async run( interaction: CommandInteraction ): Promise<boolean> {
		try {
			const mention = new SingleMention( 'MC-772' );
			const embed = await mention.getEmbed();
			embed.setFooter( { text: interaction.user.tag, iconURL: interaction.user.avatarURL() } );
			const message = await interaction.reply( { embeds: [embed], fetchReply: true } );
			if ( message instanceof Message ) {
				await ReactionsUtil.reactToMessage( message, ['🐮', '🐄', '🥛'] );
			}
		} catch {
			return false;
		}

		return true;
	}
}
