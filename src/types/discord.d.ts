import { ChatInputCommandInteraction, Collection, SlashCommandBuilder } from 'discord.js';

export interface SlashCommandJsonData {
	data: SlashCommandBuilder;
	execute: ( interaction: ChatInputCommandInteraction ) => Promise<void>;
}

declare module 'discord.js' {
	export interface Client {
		commands: Collection<string, SlashCommandJsonData>
	}
}
