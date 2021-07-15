import AdminPermission from './AdminPermission';
import AnyPermission from './AnyPermission';
import ModeratorPermission from './ModeratorPermission';
import OwnerPermission from './OwnerPermission';

export default class PermissionRegistry {
	public static ADMIN_PERMISSION = new AdminPermission();
	public static ANY_PERMISSION = new AnyPermission();
	public static MODERATOR_PERMISSION = new ModeratorPermission();
	public static OWNER_PERMISSION = new OwnerPermission();
}