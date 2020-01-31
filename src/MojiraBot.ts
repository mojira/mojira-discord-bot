import { Client, TextChannel } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from './BotConfig';
import TaskScheduler from './tasks/TaskScheduler';
import EventRegistry from './events/EventRegistry';
import FilterFeedTask from './tasks/FilterFeedTask';
import ErrorEventHandler from './events/ErrorEventHandler';
import MessageEventHandler from './events/MessageEventHandler';
import AddReactionEventHandler from './events/AddReactionEventHandler';
import RemoveReactionEventHandler from './events/RemoveReactionEventHandler';

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

			// Register events.
			EventRegistry.setClient( this.client );
			EventRegistry.add( new ErrorEventHandler() );
			EventRegistry.add( new MessageEventHandler( this.client.user.id ) );

			const rolesChannel = this.client.channels.get( BotConfig.rolesChannel );
			if ( rolesChannel && rolesChannel instanceof TextChannel ) {
				try {
					await rolesChannel.fetchMessage( BotConfig.rolesMessage );
					for ( const channel of BotConfig.requestChannels ) {
						const requestChannel = this.client.channels.get( channel );
						if ( requestChannel && requestChannel instanceof TextChannel ) {
							await requestChannel.fetchPinnedMessages();
						}
					}
					EventRegistry.add( new AddReactionEventHandler( this.client.user.id ) );
					EventRegistry.add( new RemoveReactionEventHandler( this.client.user.id ) );
				} catch ( err ) {
					this.logger.error( err );
				}
			}

			// #region Schedule tasks.
			// Filter feed tasks.
			for ( const config of BotConfig.filterFeeds ) {
				TaskScheduler.add(
					new FilterFeedTask( config, this.client.channels.get( config.channel ) ),
					BotConfig.filterFeedInterval
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
		} catch ( err ) {
			this.logger.error( `MojiraBot could not be shut down: ${ err }` );
		}
	}
}
