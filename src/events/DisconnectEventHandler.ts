import EventHandler from './EventHandler';
import MojiraBot from '../MojiraBot';

export default class DisconnectEventHandler implements EventHandler {
	public readonly eventName = 'disconnect';

	public onEvent = (): void => {
		MojiraBot.reconnect();
	};
}