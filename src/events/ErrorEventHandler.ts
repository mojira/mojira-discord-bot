import EventHandler from './EventHandler';
import MojiraBot from '../MojiraBot';

export default class ErrorEventHandler implements EventHandler {
	public readonly eventName = 'error';

	public onEvent = ( errorEvent: Error ): void => {
		MojiraBot.logger.error( `An unexpected connection error occurred: ${ errorEvent.message }` );
	};
}