import log4js from 'log4js';
import BotConfig from './src/core/BotConfig.js';
import MojiraBot from './src/core/MojiraBot.js';

log4js.configure( {
	appenders: {
		console: { type: 'console' },
	},
	categories: {
		default: { appenders: ['console'], level: 'info' },
	},
} );

process.on( 'unhandledRejection', ( reason ) => {
	log4js.getLogger( 'MojiraBot' ).error( 'Unhandled promise rejection:', reason );
} );

process.on( 'uncaughtException', ( error, origin ) => {
	log4js.getLogger( 'MojiraBot' ).error( `Uncaught exception (${ origin }):`, error );
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

	for ( const [id, appender] of Object.entries( logConfig.appenders ) ) {
		if ( appender.type === 'file' ) {
			MojiraBot.logger.info( `Logging to file ${ appender.filename }` );
		} else {
			MojiraBot.logger.info( `Logging to ${ appender.type } (id ${ id })` );
		}
	}

	await MojiraBot.start();
} catch ( err ) {
	MojiraBot.logger.error( err );
}
