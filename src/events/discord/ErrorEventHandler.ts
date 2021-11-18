import MojiraBot from '../../MojiraBot';
import EventHandler from '../EventHandler';

export default class ErrorEventHandler implements EventHandler<'error'> {
	public readonly eventName = 'error';

	public onEvent = ( errorEvent: Error ): void => {
		MojiraBot.logger.error( `An unexpected connection error occurred: ${ errorEvent.message }` );
	};
}
