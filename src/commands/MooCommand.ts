import { ChatInputCommandInteraction, Message } from 'discord.js';
import { SingleMention } from '../mentions/SingleMention.js';
import { ReactionsUtil } from '../util/ReactionsUtil.js';
import SlashCommand from './commandHandlers/SlashCommand.js';

export default class MooCommand extends SlashCommand {
	public readonly slashCommandBuilder = this.slashCommandBuilder
		.setName( 'moo' )
		.setDescription( 'Mooooo.' );

	public async run( interaction: ChatInputCommandInteraction ): Promise<boolean> {
		try {
			const mention = new SingleMention( 'MC-772', message.channel );
			const embed = await mention.getEmbed();
			embed.setFooter( { text: interaction.user.tag, iconURL: interaction.user.avatarURL() ?? undefined } );
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
