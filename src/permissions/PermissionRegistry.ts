import AnyPermission from './AnyPermission.js';
import ModeratorPermission from './ModeratorPermission.js';
import OwnerPermission from './OwnerPermission.js';

export default class PermissionRegistry {
	public static ANY_PERMISSION = new AnyPermission();
	public static MODERATOR_PERMISSION = new ModeratorPermission();
	public static OWNER_PERMISSION = new OwnerPermission();
}
