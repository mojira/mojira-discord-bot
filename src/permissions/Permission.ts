import { GuildMember } from 'discord.js';

export default abstract class Permission {
	abstract checkPermission( member?: GuildMember ): boolean;
}