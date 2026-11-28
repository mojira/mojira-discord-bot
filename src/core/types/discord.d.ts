import { Collection } from 'discord.js';
import SlashCommand from '../commands/commandHandlers/SlashCommand.js';

declare module 'discord.js' {
	export interface Client {
		commands: Collection<string, SlashCommand>
	}
}
