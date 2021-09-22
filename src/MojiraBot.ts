import { ChannelLogsQueryOptions, Client, Intents, Message, TextChannel } from 'discord.js';
import * as log4js from 'log4js';
import { Client as JiraClient } from 'jira.js';
import BotConfig from './BotConfig';
import ErrorEventHandler from './events/discord/ErrorEventHandler';
import EventRegistry from './events/EventRegistry';
import MessageDeleteEventHandler from './events/message/MessageDeleteEventHandler';
import MessageEventHandler from './events/message/MessageEventHandler';
import MessageUpdateEventHandler from './events/message/MessageUpdateEventHandler';
import ReactionAddEventHandler from './events/reaction/ReactionAddEventHandler';
import ReactionRemoveEventHandler from './events/reaction/ReactionRemoveEventHandler';
import RequestEventHandler from './events/request/RequestEventHandler';
import RequestResolveEventHandler from './events/request/RequestResolveEventHandler';
import FilterFeedTask from './tasks/FilterFeedTask';
import CachedFilterFeedTask from './tasks/CachedFilterFeedTask';
import TaskScheduler from './tasks/TaskScheduler';
import VersionFeedTask from './tasks/VersionFeedTask';
import DiscordUtil from './util/DiscordUtil';
import { RoleSelectionUtil } from './util/RoleSelectionUtil';

/**
 * Core class of MojiraBot
 *
 * @author violine1101
 * @since 2019-12-02
 */
export default class MojiraBot {
	public static logger = log4js.getLogger( 'MojiraBot' );

	public static client: Client = new Client( {
		partials: ['MESSAGE', 'REACTION', 'USER'],
		ws: {
			intents: Intents.NON_PRIVILEGED,
		},
	} );
	private static running = false;

	public static jira = new JiraClient( {
		host: 'https://bugs.mojang.com',
	} );

	public static async start(): Promise<void> {
		if ( this.running ) {
			this.logger.error( 'MojiraBot is still running. You can only start a bot that is not currently running.' );
			return;
		}

		// Ensure graceful shutdown
		process.on( 'SIGTERM', async () => {
			this.logger.info( 'The bot process has been terminated (SIGTERM).' );

			await MojiraBot.shutdown();
		} );

		process.on( 'SIGINT', async () => {
			this.logger.info( 'The bot process has been terminated (SIGINT).' );

			await MojiraBot.shutdown();
		} );

		try {
			const loginResult = await BotConfig.login( this.client );
			if ( !loginResult ) return;

			this.running = true;
			this.logger.info( `MojiraBot has been started successfully. Logged in as ${ this.client.user.tag }` );

			// Register events.
			EventRegistry.setClient( this.client );
			EventRegistry.add( new ErrorEventHandler() );

			for ( const group of BotConfig.roleGroups ) {
				const channel = await DiscordUtil.getChannel( group.channel );
				if ( channel && channel instanceof TextChannel ) {
					try {
						try {
							await RoleSelectionUtil.updateRoleSelectionMessage( group );
						} catch ( error ) {
							MojiraBot.logger.error( error );
						}
					} catch ( err ) {
						this.logger.error( err );
					}
				}
			}

			const requestChannels: TextChannel[] = [];
			const internalChannels = new Map<string, string>();
			const requestLimits = new Map<string, number>();

			if ( BotConfig.request.channels ) {
				for ( let i = 0; i < BotConfig.request.channels.length; i++ ) {
					const requestChannelId = BotConfig.request.channels[i];
					const internalChannelId = BotConfig.request.internalChannels[i];
					const requestLimit = BotConfig.request.requestLimits[i];
					try {
						const requestChannel = await DiscordUtil.getChannel( requestChannelId );
						const internalChannel = await DiscordUtil.getChannel( internalChannelId );
						if ( requestChannel instanceof TextChannel && internalChannel instanceof TextChannel ) {
							requestChannels.push( requestChannel );
							internalChannels.set( requestChannelId, internalChannelId );
							requestLimits.set( requestChannelId, requestLimit );

							// https://stackoverflow.com/questions/55153125/fetch-more-than-100-messages
							const allMessages: Message[] = [];
							let lastId: string | undefined;
							let continueSearch = true;

							while ( continueSearch ) {
								const options: ChannelLogsQueryOptions = { limit: 50 };
								if ( lastId ) {
									options.before = lastId;
								}
								const messages = await internalChannel.messages.fetch( options );
								allMessages.push( ...messages.array() );
								lastId = messages.last()?.id;
								if ( messages.size !== 50 || !lastId ) {
									continueSearch = false;
								}
							}
							this.logger.info( `Fetched ${ allMessages.length } messages from "${ internalChannel.name }"` );

							// Resolve pending resolved requests
							const handler = new RequestResolveEventHandler( this.client.user.id );
							for ( const message of allMessages ) {
								message.reactions.cache.forEach( async reaction => {
									const users = await reaction.users.fetch();
									const user = users.array().find( v => v.id !== this.client.user.id );
									if ( user ) {
										try {
											await handler.onEvent( reaction, user );
										} catch ( error ) {
											MojiraBot.logger.error( error );
										}
									}
								} );
							}
						}
					} catch ( err ) {
						this.logger.error( err );
					}
				}

				const newRequestHandler = new RequestEventHandler( internalChannels, requestLimits );
				for ( const requestChannel of requestChannels ) {
					this.logger.info( `Catching up on requests from #${ requestChannel.name }...` );

					let lastId: string | undefined = undefined;

					let pendingRequests: Message[] = [];

					let foundLastBotReaction = false;
					while ( !foundLastBotReaction ) {
						let fetchedMessages = await requestChannel.messages.fetch( { before: lastId } );

						if ( fetchedMessages.size === 0 ) break;

						fetchedMessages = fetchedMessages.sort( ( a: Message, b: Message ) => {
							return a.createdAt < b.createdAt ? -1 : 1;
						} );

						for ( const messageId of fetchedMessages.keys() ) {
							const message = fetchedMessages.get( messageId );
							const hasBotReaction = message.reactions.cache.find( reaction => reaction.me ) !== undefined;
							const hasReactions = message.reactions.cache.size > 0;

							if ( hasBotReaction ) {
								foundLastBotReaction = true;
							} else if ( !hasReactions ) {
								pendingRequests.push( message );
							}
						}

						lastId = fetchedMessages.firstKey();
					}

					pendingRequests = pendingRequests.sort( ( a: Message, b: Message ) => {
						return a.createdAt < b.createdAt ? -1 : 1;
					} );

					for ( const message of pendingRequests ) {
						try {
							await newRequestHandler.onEvent( message );
						} catch ( error ) {
							MojiraBot.logger.error( error );
						}
					}
				}

				this.logger.info( 'Fully caught up on requests.' );
			}

			EventRegistry.add( new ReactionAddEventHandler( this.client.user.id, internalChannels, requestLimits ) );
			EventRegistry.add( new ReactionRemoveEventHandler( this.client.user.id ) );
			EventRegistry.add( new MessageEventHandler( this.client.user.id, internalChannels, requestLimits ) );
			EventRegistry.add( new MessageUpdateEventHandler( this.client.user.id, internalChannels ) );
			EventRegistry.add( new MessageDeleteEventHandler( this.client.user.id, internalChannels ) );

			// #region Schedule tasks.
			// Filter feed tasks.
			for ( const config of BotConfig.filterFeeds ) {
				if ( config.cached ) {
					TaskScheduler.addTask(
						new CachedFilterFeedTask( config, await DiscordUtil.getChannel( config.channel ) ),
						config.interval
					);
				} else {
					TaskScheduler.addTask(
						new FilterFeedTask( config, await DiscordUtil.getChannel( config.channel ) ),
						config.interval
					);
				}
			}

			// Version feed tasks.
			for ( const config of BotConfig.versionFeeds ) {
				TaskScheduler.addTask(
					new VersionFeedTask( config, await DiscordUtil.getChannel( config.channel ) ),
					config.interval
				);
			}
			// #endregion

			// TODO Change to custom status when discord.js#3552 is merged into current version of package
			try {
				await this.client.user.setActivity( '!jira help' );
			} catch ( error ) {
				MojiraBot.logger.error( error );
			}

			const homeChannel = await DiscordUtil.getChannel( BotConfig.homeChannel );

			if ( homeChannel instanceof TextChannel ) {
				await ( homeChannel as TextChannel ).send( 'Hey, I have been restarted!' );
			}
		} catch ( err ) {
			this.logger.error( `MojiraBot could not be started: ${ err }` );
			await this.shutdown();
		}
	}

	public static async shutdown(): Promise<void> {
		if ( !this.running ) {
			this.logger.error( 'MojiraBot is not running yet. You can only shut down a running bot.' );
			return;
		}

		this.logger.info( 'Initiating graceful shutdown...' );

		try {
			TaskScheduler.clearAll();
			this.client.destroy();
			this.running = false;
			this.logger.info( 'MojiraBot has been successfully shut down.' );

			log4js.shutdown( ( err ) => {
				if ( err ) {
					console.log( err );
				}
				process.exit();
			} );
		} catch ( err ) {
			this.logger.error( `MojiraBot could not be shut down: ${ err }` );
		}
	}
}
