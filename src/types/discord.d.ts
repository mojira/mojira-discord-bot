import { ChatInputCommandInteraction, Collection, SharedSlashCommand } from 'discord.js';

export interface SlashCommandJsonData {
	data: SharedSlashCommand;
	execute: ( interaction: ChatInputCommandInteraction ) => Promise<void>;
}

declare module 'discord.js' {
	export interface Client {
		commands: Collection<string, SlashCommandJsonData>
	}
}
