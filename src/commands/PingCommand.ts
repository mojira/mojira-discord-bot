import { ChatInputCommandInteraction } from 'discord.js';
import SlashCommand from './commandHandlers/SlashCommand.js';

export default class PingCommand extends SlashCommand {
	public readonly slashCommandBuilder = this.slashCommandBuilder
		.setName( 'ping' )
		.setDescription( 'Check if MojiraBot is online.' );

	public async run( interaction: ChatInputCommandInteraction ): Promise<boolean> {
		let message;

		try {
			message = await interaction.reply( { content: `${ interaction.user.toString() } Pong!`, fetchReply: true } );
		} catch {
			return false;
		}

		try {
			await message.react( '🏓' );
		} catch {
			return false;
		}

		return true;
	}
}
