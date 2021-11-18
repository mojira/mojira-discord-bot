import Permission from './Permission';

export default class AnyPermission extends Permission {
	public checkPermission(): boolean {
		return true;
	}
}
