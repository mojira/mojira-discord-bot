import Task from './Task';
import { Message } from 'discord.js';
import MessageTask from './MessageTask';

export default class TaskScheduler {
	private static readonly intervals: NodeJS.Timeout[] = [];
	private static readonly timeouts: NodeJS.Timeout[] = [];
	private static readonly messageIntervals: Map<string, NodeJS.Timeout[]> = new Map();
	private static readonly messageTimeouts: Map<string, NodeJS.Timeout[]> = new Map();

	public static addTask( task: Task, interval: number ): void {
		const id = setInterval( task.run.bind( task ), interval );
		this.intervals.push( id );
	}

	public static addOneTimeTask( task: Task, delay: number ): void {
		const id = setTimeout( task.run.bind( task ), delay );
		this.timeouts.push( id );
	}

	public static addMessageTask( message: Message, task: MessageTask, interval: number ): void {
		const id = setInterval( task.run.bind( task ), interval, message );
		const ids = this.messageIntervals.get( message.id ) || [];
		ids.push( id );
		this.messageIntervals.set( message.id, ids );
	}

	public static addOneTimeMessageTask( message: Message, task: MessageTask, delay: number ): void {
		const id = setTimeout( task.run.bind( task ), delay, message );
		const ids = this.messageTimeouts.get( message.id ) || [];
		ids.push( id );
		this.messageTimeouts.set( message.id, ids );
	}

	public static clearMessageTasks( message: Message ): void {
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
