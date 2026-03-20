import { ChatInputCommandInteraction, InteractionCallbackResponse } from 'discord.js';
import { SingleMention } from '../mentions/SingleMention.js';
import { ReactionsUtil } from '../util/ReactionsUtil.js';
import SlashCommand from './commandHandlers/SlashCommand.js';

export default class MooCommand extends SlashCommand {
	public readonly slashCommandBuilder = this.slashCommandBuilder
		.setName( 'moo' )
		.setDescription( 'Mooooo.' );

	public async run( interaction: ChatInputCommandInteraction ): Promise<boolean> {
		try {
			if ( interaction.channel === null ) return false;
			const mention = new SingleMention( 'MC-772', interaction.channel );
			const embed = await mention.getEmbed();
			embed.setFooter( { text: interaction.user.tag, iconURL: interaction.user.avatarURL() ?? undefined } );
			const response: InteractionCallbackResponse = await interaction.reply( { embeds: [embed], withResponse: true } );
			if ( response?.resource?.message ) {
				await ReactionsUtil.reactToMessage( response.resource.message, ['🐮', '🐄', '🥛'] );
			}
		} catch {
			return false;
		}

		return true;
	}
}
