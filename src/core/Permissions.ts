import { GuildMember } from 'discord.js';
import BotConfig from './BotConfig.js';

export abstract class Permission {
	abstract checkPermission( member?: GuildMember ): boolean;
}

class AnyPermission extends Permission {
	public checkPermission(): boolean {
		return true;
	}
}

/**
 * Permission level 'Moderator'
 * This allows the command to be run by any guild member who has the "Manage messages" permission serverwide.
 */
class ModeratorPermission extends Permission {
	public checkPermission( member?: GuildMember ): boolean {
		return member?.permissions.has( 'ManageMessages' ) ?? false;
	}
}

/**
 * Permission level 'Admin'
 * This allows the command to be run by any guild member who has the "Ban members" permission serverwide.
 */
class AdminPermission extends Permission {
	public checkPermission( member?: GuildMember ): boolean {
		return member?.permissions.has( 'BanMembers' ) ?? false;
	}
}

class OwnerPermission extends Permission {
	public checkPermission( member?: GuildMember ): boolean {
		return member ? BotConfig.owners.includes( member.id ) : false;
	}
}

export class PermissionRegistry {
	public static ADMIN_PERMISSION = new AdminPermission();
	public static ANY_PERMISSION = new AnyPermission();
	public static MODERATOR_PERMISSION = new ModeratorPermission();
	public static OWNER_PERMISSION = new OwnerPermission();
}
