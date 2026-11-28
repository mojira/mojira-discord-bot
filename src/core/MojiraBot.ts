import { ActivityType, Client, ClientUser, Collection, FetchMessagesOptions, GatewayIntentBits, Message, Partials, Snowflake, TextChannel } from 'discord.js';
import log4js from 'log4js';
import { Version2Client as JiraClient } from 'jira.js';
import BotConfig from './BotConfig.js';
import ErrorEventHandler from './events/ErrorEventHandler.js';
import EventRegistry from './events/EventRegistry.js';
import MessageDeleteEventHandler from './events/MessageDeleteEventHandler.js';
import MessageEventHandler from './events/MessageEventHandler.js';
import MessageUpdateEventHandler from './events/MessageUpdateEventHandler.js';
import ModmailCatchUp from '../modules/modmail/ModmailCatchUp.js';
import ModmailThreadDeleteEventHandler from '../modules/modmail/events/ModmailThreadDeleteEventHandler.js';
import ModmailThreadUpdateEventHandler from '../modules/modmail/events/ModmailThreadUpdateEventHandler.js';
import ModmailTypingEventHandler from '../modules/modmail/events/ModmailTypingEventHandler.js';
import ReactionAddEventHandler from './events/ReactionAddEventHandler.js';
import ReactionRemoveEventHandler from './events/ReactionRemoveEventHandler.js';
import RequestEventHandler from '../modules/requests/events/RequestEventHandler.js';
import RequestResolveEventHandler from '../modules/requests/events/RequestResolveEventHandler.js';
import FilterFeedTask from '../modules/feeds/FilterFeedTask.js';
import CachedFilterFeedTask from '../modules/feeds/CachedFilterFeedTask.js';
import ReleaseFeedTask from '../modules/releasefeed/ReleaseFeedTask.js';
import TaskScheduler from './tasks/TaskScheduler.js';
import VersionFeedTask from '../modules/feeds/VersionFeedTask.js';
import DiscordUtil from '../util/DiscordUtil.js';
import { ModmailUtil } from '../modules/modmail/ModmailUtil.js';
import { RoleSelectionUtil } from '../modules/roles/RoleSelectionUtil.js';
import InteractionEventHandler from './events/InteractionEventHandler.js';

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
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildExpressions,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.GuildMessageReactions,
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

			ModmailUtil.initDatabase();

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
									try {
										const users = await reaction.users.fetch();
										const user = [...users.values()].find( v => v.id !== this.botUser.id );
										if ( user ) {
											await handler.onEvent( reaction, user );
										}
									} catch ( error ) {
										MojiraBot.logger.error( error );
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
						let fetchedMessages: Collection<string, Message> = await requestChannel.messages.fetch( { before: lastId } );

						if ( fetchedMessages.size === 0 ) break;

						fetchedMessages = fetchedMessages.sort( ( a: Message, b: Message ) => {
							return a.createdAt < b.createdAt ? -1 : 1;
						} );

						for ( const message of fetchedMessages.values() ) {
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

			if ( BotConfig.modmailEnabled ) {
				this.logger.info( 'Catching up on modmail...' );
				await new ModmailCatchUp().run( this.client );
				this.logger.info( 'Fully caught up on modmail.' );
			}

			EventRegistry.add( new ReactionAddEventHandler( this.botUser.id, internalChannels, requestLimits ) );
			EventRegistry.add( new ReactionRemoveEventHandler( this.botUser.id ) );
			EventRegistry.add( new MessageEventHandler( this.botUser.id, internalChannels, requestLimits ) );
			EventRegistry.add( new MessageUpdateEventHandler( this.botUser.id, internalChannels ) );
			EventRegistry.add( new MessageDeleteEventHandler( this.botUser.id, internalChannels ) );
			EventRegistry.add( new InteractionEventHandler( this.client ) );

			if ( BotConfig.modmailEnabled ) {
				EventRegistry.add( new ModmailThreadUpdateEventHandler() );
				EventRegistry.add( new ModmailThreadDeleteEventHandler() );
				EventRegistry.add( new ModmailTypingEventHandler() );
			}

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

			// Release feed task.
			if ( BotConfig.releaseFeed ) {
				const channel = await DiscordUtil.getChannel( BotConfig.releaseFeed.channel );
				if ( channel?.isSendable() ) {
					TaskScheduler.addTask(
						new ReleaseFeedTask( BotConfig.releaseFeed, channel ),
						BotConfig.releaseFeed.interval * 1000
					);
				}
			}
			// #endregion

			try {
				this.botUser.setActivity( '/help', { type: ActivityType.Custom } );
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
