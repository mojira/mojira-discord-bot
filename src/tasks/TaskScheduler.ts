import Task from './Task';

export default class TaskScheduler {
	public static add( task: Task, interval: number ): void {
		setInterval( task.run, interval );
	}
}
