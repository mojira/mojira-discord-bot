import { GuildMember } from 'discord.js';
import Permission from './Permission.js';

/**
 * Permission level 'Admin'
 * This allows the command to be run by any guild member who has the "Ban members" permission serverwide.
 */
export default class AdminPermission extends Permission {
	public checkPermission( member?: GuildMember ): boolean {
		return member?.permissions.has( 'BanMembers' ) ?? false;
	}
}
