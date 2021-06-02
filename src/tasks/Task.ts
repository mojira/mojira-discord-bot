import MojiraBot from '../MojiraBot';

export default abstract class Task {
	private static maxId = 0;
	protected id = Task.maxId++;

	private initialized = false;

	protected async init(): Promise<void> {
		return;
	}

	protected abstract run(): Promise<void>;

	public async execute(): Promise<void> {
		if ( !this.initialized ) {
			try {
				MojiraBot.logger.debug( `Initializing ${ this.asString() }` );
				await this.init();
				this.initialized = true;
				MojiraBot.logger.info( `Initialized ${ this.asString() }` );
			} catch ( error ) {
				MojiraBot.logger.error( `Could not initialize ${ this.asString() }. Information:
										\tStatus code: ${ error.response?.status || undefined }
										\tStatus text: ${ error.response?.statusText || undefined }
										\tError messages: ${ error.response?.data.errorMessages || undefined }`.replace( /\t/g, '' ).replace( /(?<=\n).*/g, '\t$&' ) );
			}
		}

		if ( this.initialized ) {
			MojiraBot.logger.debug( `Running ${ this.asString() }` );
			await this.run();
		}
	}

	public abstract asString(): string;
}
