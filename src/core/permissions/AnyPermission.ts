import Permission from './Permission.js';

export default class AnyPermission extends Permission {
	public checkPermission(): boolean {
		return true;
	}
}
