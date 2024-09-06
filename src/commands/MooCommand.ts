import { ChatInputCommandInteraction, Message } from 'discord.js';
import { SingleMention } from '../mentions/SingleMention.js';
import { ReactionsUtil } from '../util/ReactionsUtil.js';
import SlashCommand from './commandHandlers/SlashCommand.js';
import DiscordUtil from '../util/DiscordUtil.js';

export default class MooCommand extends SlashCommand {
	public readonly slashCommandBuilder = this.slashCommandBuilder
		.setName( 'moo' )
		.setDescription( 'Mooooo.' );

	public async run( interaction: ChatInputCommandInteraction ): Promise<boolean> {
		try {
			if ( interaction.channel === null ) return false;
			const mention = new SingleMention( 'MC-772', interaction.channel );
			const embed = await mention.getEmbed();
			embed.setFooter( DiscordUtil.getUserFooter( interaction.user ) );
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
