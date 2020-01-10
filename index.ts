import * as log4js from 'log4js';
import fs = require( 'fs' );
import BotConfig from './src/BotConfig';
import MojiraBot from './src/MojiraBot';

const settingsJson = fs.readFileSync( 'settings.json', 'utf8' );

log4js.configure( {
	appenders: {
		console: { type: 'console' },
	},
	categories: {
		default: { appenders: ['console'], level: 'info' },
	},
} );

try {
	BotConfig.init( settingsJson );
	MojiraBot.start();
}
catch ( err ) {
	MojiraBot.logger.error( err );
}
