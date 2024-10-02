import { Client, ClientUser, FetchMessagesOptions, GatewayIntentBits, Message, Partials, Snowflake, TextChannel } from 'discord.js';
import log4js from 'log4js';
import { Version2Client as JiraClient } from 'jira.js';
import BotConfig from './BotConfig.js';
import ErrorEventHandler from './events/discord/ErrorEventHandler.js';
import EventRegistry from './events/EventRegistry.js';
import MessageDeleteEventHandler from './events/message/MessageDeleteEventHandler.js';
import MessageEventHandler from './events/message/MessageEventHandler.js';
import MessageUpdateEventHandler from './events/message/MessageUpdateEventHandler.js';
import ReactionAddEventHandler from './events/reaction/ReactionAddEventHandler.js';
import ReactionRemoveEventHandler from './events/reaction/ReactionRemoveEventHandler.js';
import RequestEventHandler from './events/request/RequestEventHandler.js';
import RequestResolveEventHandler from './events/request/RequestResolveEventHandler.js';
import FilterFeedTask from './tasks/FilterFeedTask.js';
import CachedFilterFeedTask from './tasks/CachedFilterFeedTask.js';
import TaskScheduler from './tasks/TaskScheduler.js';
import VersionFeedTask from './tasks/VersionFeedTask.js';
import DiscordUtil from './util/DiscordUtil.js';
import { RoleSelectionUtil } from './util/RoleSelectionUtil.js';
import InteractionEventHandler from './events/interaction/InteractionEventHandler.js';

/**
 * Core class of MojiraBot
 *
 * @author violine1101
 * @since 2019-12-02
 */
export default class MojiraBot {
	public static logger = log4js.getLogger( 'MojiraBot' );

	public static client: Client = new Client( {
		partials: [
			Partials.Message,
			Partials.Reaction,
			Partials.User,
			Partials.Channel,
		],
		intents: [
			// TODO: We might not need all of these intents
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildBans,
			GatewayIntentBits.GuildEmojisAndStickers,
			GatewayIntentBits.GuildIntegrations,
			GatewayIntentBits.GuildWebhooks,
			GatewayIntentBits.GuildInvites,
			GatewayIntentBits.GuildVoiceStates,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.GuildMessageReactions,
			GatewayIntentBits.GuildMessageTyping,
			GatewayIntentBits.DirectMessages,
			GatewayIntentBits.DirectMessageReactions,
			GatewayIntentBits.DirectMessageTyping,
			GatewayIntentBits.MessageContent,
		],
		allowedMentions: {
			parse: ['users'],
		},
	} );

	private static running = false;
	private static botUser: ClientUser;

	public static jira: JiraClient;

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
			BotConfig.jiraLogin();
			const loginResult = await BotConfig.login( this.client );
			if ( !loginResult || !this.client.user ) return;

			BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS modmail_bans (\'user\' varchar)' );
			BotConfig.database.exec( 'CREATE TABLE IF NOT EXISTS modmail_threads (\'user\' varchar, \'thread\' varchar)' );

			this.botUser = this.client.user;
			this.running = true;
			this.logger.info( `MojiraBot has been started successfully. Logged in as ${ this.botUser.tag }` );

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
			const internalChannels = new Map<Snowflake, Snowflake>();
			const requestLimits = new Map<Snowflake, number>();

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
							let lastId: Snowflake | undefined;
							let continueSearch = true;

							while ( continueSearch ) {
								const options: FetchMessagesOptions = { limit: 50 };
								if ( lastId ) {
									options.before = lastId;
								}
								const messages = await internalChannel.messages.fetch( options );
								allMessages.push( ...messages.values() );
								lastId = messages.last()?.id;
								if ( messages.size !== 50 || !lastId ) {
									continueSearch = false;
								}
							}
							this.logger.info( `Fetched ${ allMessages.length } messages from "${ internalChannel.name }"` );

							// Resolve pending resolved requests
							const handler = new RequestResolveEventHandler( this.botUser.id );
							for ( const message of allMessages ) {
								message.reactions.cache.forEach( async reaction => {
									const users = await reaction.users.fetch();
									const user = [...users.values()].find( v => v.id !== this.botUser.id );
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

					let lastId: Snowflake | undefined = undefined;

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

			EventRegistry.add( new ReactionAddEventHandler( this.botUser.id, internalChannels, requestLimits ) );
			EventRegistry.add( new ReactionRemoveEventHandler( this.botUser.id ) );
			EventRegistry.add( new MessageEventHandler( this.botUser.id, internalChannels, requestLimits ) );
			EventRegistry.add( new MessageUpdateEventHandler( this.botUser.id, internalChannels ) );
			EventRegistry.add( new MessageDeleteEventHandler( this.botUser.id, internalChannels ) );
			EventRegistry.add( new InteractionEventHandler( this.client ) );

			// #region Schedule tasks.
			// Filter feed tasks.
			for ( const config of BotConfig.filterFeeds ) {
				const channel = await DiscordUtil.getChannel( config.channel );
				if ( channel === undefined || !channel.isSendable() ) continue;

				if ( config.cached ) {
					TaskScheduler.addTask(
						new CachedFilterFeedTask( config, channel ),
						config.interval
					);
				} else {
					TaskScheduler.addTask(
						new FilterFeedTask( config, channel ),
						config.interval
					);
				}
			}

			// Version feed tasks.
			for ( const config of BotConfig.versionFeeds ) {
				const channel = await DiscordUtil.getChannel( config.channel );
				if ( channel === undefined || !channel.isSendable() ) continue;

				TaskScheduler.addTask(
					new VersionFeedTask( config, channel ),
					config.interval
				);
			}
			// #endregion

			// TODO Change to custom status when discord.js#3552 is merged into current version of package
			try {
				this.botUser.setActivity( '/help' );
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
			await this.client.destroy();
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
