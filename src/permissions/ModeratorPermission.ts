import { GuildMember, Permissions } from 'discord.js';
import Permission from './Permission';

/**
 * Permission level 'Moderator'
 * This allows the command to be run by any guild member who has the "Manage messages" permission serverwide.
 */
export default class ModeratorPermission extends Permission {
	public checkPermission( member?: GuildMember ): boolean {
		return member?.permissions.has( Permissions.FLAGS.MANAGE_MESSAGES ) ?? false;
	}
}
