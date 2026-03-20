import { ChatInputCommandInteraction, InteractionCallbackResponse } from 'discord.js';
import SlashCommand from './commandHandlers/SlashCommand.js';

export default class PingCommand extends SlashCommand {
	public readonly slashCommandBuilder = this.slashCommandBuilder
		.setName( 'ping' )
		.setDescription( 'Check if MojiraBot is online.' );

	public async run( interaction: ChatInputCommandInteraction ): Promise<boolean> {
		let response: InteractionCallbackResponse;

		try {
			response = await interaction.reply( { content: `${ interaction.user.toString() } Pong!`, withResponse: true } );
		} catch {
			return false;
		}

		try {
			await response.resource?.message?.react( '🏓' );
		} catch {
			return false;
		}

		return true;
	}
}
