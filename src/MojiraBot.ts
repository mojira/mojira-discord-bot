import { Client, TextChannel, ChannelLogsQueryOptions, Message } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from './BotConfig';
import TaskScheduler from './tasks/TaskScheduler';
import EventRegistry from './events/EventRegistry';
import FilterFeedTask from './tasks/FilterFeedTask';
import ErrorEventHandler from './events/ErrorEventHandler';
import MessageEventHandler from './events/MessageEventHandler';
import AddReactionEventHandler from './events/AddReactionEventHandler';
import RemoveReactionEventHandler from './events/RemoveReactionEventHandler';
import ResolveRequestEventHandler from './events/requests/ResolveRequestEventHandler';
import MessageDeleteEventHandler from './events/MessageDeleteEventHandler';
import MessageUpdateEventHandler from './events/MessageUpdateEventHandler';
import VersionFeedTask from './tasks/VersionFeedTask';
import NewRequestEventHandler from './events/requests/NewRequestEventHandler';

/**
 * Core class of MojiraBot
 *
 * @author violine1101
 * @since 2019-12-02
 */
export default class MojiraBot {
	public static logger = log4js.getLogger( 'MojiraBot' );

	public static client: Client = new Client();
	private static running = false;

	public static async start(): Promise<void> {
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

		if ( this.running ) {
			this.logger.error( 'MojiraBot is still running. You can only start a bot that is not currently running.' );
			return;
		}

		try {
			const loginResult = await BotConfig.login( this.client );
			if ( !loginResult ) return;

			this.running = true;
			this.logger.info( `MojiraBot has been started successfully. Logged in as ${ this.client.user.tag }` );

			if ( BotConfig.debug ) {
				this.logger.info( 'Debug mode is activated' );
			}

			if ( BotConfig.logDirectory ) {
				this.logger.info( `Writing log to ${ logConfig.appenders.log[ 'filename' ] }` );
			}

			// Register events.
			EventRegistry.setClient( this.client );
			EventRegistry.add( new ErrorEventHandler() );
			EventRegistry.add( new RemoveReactionEventHandler( this.client.user.id ) );

			const rolesChannel = this.client.channels.get( BotConfig.rolesChannel );
			if ( rolesChannel && rolesChannel instanceof TextChannel ) {
				try {
					await rolesChannel.fetchMessage( BotConfig.rolesMessage );
				} catch ( err ) {
					this.logger.error( err );
				}
			}

			const requestChannels: TextChannel[] = [];
			const internalChannels = new Map<string, TextChannel>();
			if ( BotConfig.request.channels ) {
				for ( let i = 0; i < BotConfig.request.channels.length; i++ ) {
					const requestChannelId = BotConfig.request.channels[i];
					const internalChannelId = BotConfig.request.internalChannels[i];
					try {
						const requestChannel = this.client.channels.get( requestChannelId );
						const internalChannel = this.client.channels.get( internalChannelId );
						if ( requestChannel instanceof TextChannel && internalChannel instanceof TextChannel ) {
							requestChannels.push( requestChannel );
							internalChannels.set( requestChannelId, internalChannel );
							// https://stackoverflow.com/questions/55153125/fetch-more-than-100-messages
							const allMessages: Message[] = [];
							let lastId: string | undefined;
							// eslint-disable-next-line no-constant-condition
							while ( true ) {
								const options: ChannelLogsQueryOptions = { limit: 50 };
								if ( lastId ) {
									options.before = lastId;
								}
								const messages = await internalChannel.fetchMessages( options );
								allMessages.push( ...messages.array() );
								lastId = messages.last()?.id;
								if ( messages.size !== 50 || !lastId ) {
									break;
								}
							}
							const handler = new ResolveRequestEventHandler();
							for ( const message of allMessages ) {
								message.reactions.forEach( async reaction => {
									const users = await reaction.fetchUsers();
									const user = users.array().find( v => v.id !== this.client.user.id );
									if ( user ) {
										handler.onEvent( reaction, user );
									}
								} );
							}
						}
					} catch ( err ) {
						this.logger.error( err );
					}
				}
				const newRequestHandler = new NewRequestEventHandler( internalChannels );
				for ( const requestChannel of requestChannels ) {
					let lastId: string | undefined = undefined;
					// eslint-disable-next-line no-constant-condition
					while ( true ) {
						const options: ChannelLogsQueryOptions = { limit: 1, before: lastId };
						const message = ( await requestChannel.fetchMessages( options ) ).first();
						if ( message?.reactions?.size === 0 ) {
							newRequestHandler.onEvent( message );
							lastId = message.id;
						} else {
							break;
						}
					}
				}
			}
			EventRegistry.add( new AddReactionEventHandler( this.client.user.id, internalChannels ) );
			EventRegistry.add( new MessageEventHandler( this.client.user.id, internalChannels ) );
			EventRegistry.add( new MessageUpdateEventHandler( this.client.user.id, internalChannels ) );
			EventRegistry.add( new MessageDeleteEventHandler( this.client.user.id, internalChannels ) );

			// #region Schedule tasks.
			// Filter feed tasks.
			for ( const config of BotConfig.filterFeeds ) {
				TaskScheduler.addTask(
					new FilterFeedTask( config, this.client.channels.get( config.channel ) ),
					BotConfig.filterFeedInterval
				);
			}

			// Version feed tasks.
			for ( const config of BotConfig.versionFeeds ) {
				TaskScheduler.addTask(
					new VersionFeedTask( config, this.client.channels.get( config.channel ) ),
					BotConfig.versionFeedInterval
				);
			}
			// #endregion

			// TODO Change to custom status when discord.js#3552 is merged into current version of package
			this.client.user.setActivity( '!jira help' );

			const homeChannel = this.client.channels.find( channel => channel.id === BotConfig.homeChannel );

			if ( homeChannel instanceof TextChannel ) {
				await ( homeChannel as TextChannel ).send( 'Hey, I have been restarted!' );
			}

			process.on( 'beforeExit', exitCode => {
				this.logger.info( `The bot has been shut down. Exit code: ${ exitCode }` );
				if ( this.running ) {
					this.client.destroy();
				}
			} );
		} catch ( err ) {
			this.logger.error( `MojiraBot could not be started: ${ err }` );
		}
	}

	public static async shutdown(): Promise<void> {
		if ( !this.running ) {
			this.logger.error( 'MojiraBot is not running yet. You can only shut down a running bot.' );
			return;
		}

		try {
			TaskScheduler.clearAll();
			await this.client.destroy();
			this.running = false;
			this.logger.info( 'MojiraBot has been successfully shut down.' );
			log4js.shutdown( ( err ) => err && console.log( err ) );
		} catch ( err ) {
			this.logger.error( `MojiraBot could not be shut down: ${ err }` );
		}
	}
}
