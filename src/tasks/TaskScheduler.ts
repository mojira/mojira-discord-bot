import Task from './Task.js';
import { Message, PartialMessage } from 'discord.js';
import MessageTask from './MessageTask.js';

export default class TaskScheduler {
	private static readonly intervals: NodeJS.Timeout[] = [];
	private static readonly timeouts: NodeJS.Timeout[] = [];
	private static readonly messageIntervals: Map<string, NodeJS.Timeout[]> = new Map();
	private static readonly messageTimeouts: Map<string, NodeJS.Timeout[]> = new Map();

	public static addTask( task: Task, interval: number ): void {
		const id = setInterval( task.execute.bind( task ), interval );
		// Run the task directly after it's been added
		task.execute.bind( task )();
		this.intervals.push( id );
	}

	public static addOneTimeTask( task: Task, delay: number ): void {
		const id = setTimeout( task.execute.bind( task ), delay );
		this.timeouts.push( id );
	}

	public static addMessageTask( message: Message | PartialMessage, task: MessageTask, interval: number ): void {
		const id = setInterval( task.run.bind( task ), interval, message );
		const ids = this.messageIntervals.get( message.id ) || [];
		ids.push( id );
		this.messageIntervals.set( message.id, ids );
	}

	public static addOneTimeMessageTask( message: Message | PartialMessage, task: MessageTask, delay: number ): void {
		const id = setTimeout( task.run.bind( task ), delay, message );
		const ids = this.messageTimeouts.get( message.id ) || [];
		ids.push( id );
		this.messageTimeouts.set( message.id, ids );
	}

	public static clearMessageTasks( message: Message | PartialMessage ): void {
		const intervalIds = this.messageIntervals.get( message.id );
		if ( intervalIds ) {
			for ( const id of intervalIds ) {
				clearInterval( id );
			}
		}
		this.messageIntervals.delete( message.id );

		const timeoutIds = this.messageTimeouts.get( message.id );
		if ( timeoutIds ) {
			for ( const id of timeoutIds ) {
				clearTimeout( id );
			}
		}
		this.messageTimeouts.delete( message.id );
	}

	public static clearAll(): void {
		for ( const id of this.intervals ) {
			clearInterval( id );
		}
		for ( const id of this.timeouts ) {
			clearTimeout( id );
		}
		for ( const ids of this.messageIntervals.values() ) {
			for ( const id of ids ) {
				clearInterval( id );
			}
		}
		for ( const ids of this.messageTimeouts.values() ) {
			for ( const id of ids ) {
				clearTimeout( id );
			}
		}
	}
}
