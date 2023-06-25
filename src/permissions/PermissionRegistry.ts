import AdminPermission from './AdminPermission.js';
import AnyPermission from './AnyPermission.js';
import ModeratorPermission from './ModeratorPermission.js';
import OwnerPermission from './OwnerPermission.js';

export default class PermissionRegistry {
	public static ADMIN_PERMISSION = new AdminPermission();
	public static ANY_PERMISSION = new AnyPermission();
	public static MODERATOR_PERMISSION = new ModeratorPermission();
	public static OWNER_PERMISSION = new OwnerPermission();
}
