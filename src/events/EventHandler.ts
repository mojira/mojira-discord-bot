import { ClientEvents } from 'discord.js';

/**
 * Interface for Discord events
 *
 * @author Bemoty
 * @since 2019-03-29
 */
export default interface EventHandler<K extends keyof ClientEvents> {
	eventName: K;
	onEvent: ( ...args: ClientEvents[K] ) => void;
}