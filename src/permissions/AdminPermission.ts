import { GuildMember } from 'discord.js';
import Permission from './Permission';

/**
 * Permission level 'Admin'
 * This allows the command to be run by any guild member who has the "Ban members" permission serverwide.
 */
export default class AdminPermission extends Permission {
	public checkPermission( member?: GuildMember ): boolean {
		return member?.hasPermission( 'BAN_MEMBERS' );
	}
}