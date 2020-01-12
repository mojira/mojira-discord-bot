import Task from './Task';

export default class TaskScheduler {
	private static scheduledTasks: NodeJS.Timeout[] = [];

	public static add( task: Task, interval: number ): void {
		const id = setInterval( task.run.bind( task ), interval );
		this.scheduledTasks.push(id);
	}

	public static clearAll(): void {
		for (const id of this.scheduledTasks) {
			clearInterval(id);
		}
	}
}
