/**
 * Interface for Discord events
 *
 * @author Bemoty
 * @since 2019-03-29
 */
export default interface EventHandler {
	eventName: string;
	onEvent: Function;
}