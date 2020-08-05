import * as log4js from 'log4js';
import BotConfig from './src/BotConfig';
import MojiraBot from './src/MojiraBot';

log4js.configure( {
	appenders: {
		console: { type: 'console' },
	},
	categories: {
		default: { appenders: ['console'], level: 'info' },
	},
} );

try {
	BotConfig.init();
	MojiraBot.start();
} catch ( err ) {
	MojiraBot.logger.error( err );
}
