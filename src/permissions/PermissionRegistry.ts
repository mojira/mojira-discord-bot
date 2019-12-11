import AnyPermission from './AnyPermission';
import ModeratorPermission from './ModeratorPermission';
import OwnerPermission from './OwnerPermission';

export class PermissionRegistry {
	public static ANY_PERMISSION = new AnyPermission();
	public static MODERATOR_PERMISSION = new ModeratorPermission();
	public static OWNER_PERMISSION = new OwnerPermission();
}