import log4js from 'log4js';
import BotConfig from './src/BotConfig.js';
import MojiraBot from './src/MojiraBot.js';

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

	const logConfig: log4js.Configuration = {
		appenders: {
			out: { type: 'stdout' },
		},
		categories: {
			default: { appenders: [ 'out' ], level: BotConfig.debug ? 'debug' : 'info' },
		},
	};

	if ( BotConfig.logDirectory ) {
		logConfig.appenders.log = {
			type: 'file',
			filename: `${ BotConfig.logDirectory }/${ new Date().toJSON().replace( /[:.]/g, '_' ) }.log`,
		};
		logConfig.categories.default.appenders.push( 'log' );
	}

	log4js.configure( logConfig );

	if ( BotConfig.debug ) {
		MojiraBot.logger.info( 'Debug mode is activated' );
	}

	if ( BotConfig.logDirectory ) {
		MojiraBot.logger.info( `Writing log to ${ logConfig.appenders.log[ 'filename' ] }` );
	}

	await MojiraBot.start();
} catch ( err ) {
	MojiraBot.logger.error( err );
}
