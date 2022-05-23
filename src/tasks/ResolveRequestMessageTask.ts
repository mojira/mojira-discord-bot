import { EmojiResolvable, Message, MessageEmbed, TextChannel, User } from 'discord.js';
import BotConfig from '../BotConfig';
import DiscordUtil from '../util/DiscordUtil';
import { RequestsUtil } from '../util/RequestsUtil';
import MessageTask from './MessageTask';
import * as log4js from 'log4js';

export default class ResolveRequestMessageTask extends MessageTask {
	private static logger = log4js.getLogger( 'ResolveRequestMessageTask' );

	private readonly emoji: EmojiResolvable;
	private readonly user: User;

	constructor( emoji: EmojiResolvable, user: User ) {
		super();
		this.emoji = emoji;
		this.user = user;
	}

	public async run( copy: Message ): Promise<void> {
		// If the message has been deleted, don't do anything
		if ( copy === undefined ) return;

		const origin = await RequestsUtil.getOriginMessage( copy );

		if ( copy.deletable ) {
			try {
				await copy.delete();
			} catch ( error ) {
				ResolveRequestMessageTask.logger.error( error );
			}
		}

		if ( origin ) {
			try {
				await origin.reactions.removeAll();
			} catch ( error ) {
				ResolveRequestMessageTask.logger.error( error );
			}

			try {
				await origin.react( this.emoji );
			} catch ( error ) {
				ResolveRequestMessageTask.logger.error( error );
			}

			if ( origin.author ) {
				const response = BotConfig.request.prependResponseMessageInLog ?
					RequestsUtil.getResponseMessage( origin ) : '';

				const log = new MessageEmbed()
					.setColor( 'GREEN' )
					.setAuthor( origin.author.tag, origin.author.avatarURL() )
					.setDescription( origin.content )
					.addField( 'Channel', origin.channel.toString(), true )
					.addField( 'Message', `[Here](${ origin.url })`, true )
					.setFooter( `${ this.user.tag } resolved as ${ this.emoji }`, this.user.avatarURL() )
					.setTimestamp( new Date() );

				if ( origin.member.roles.cache.has( BotConfig.request.normalNotificationsRole ) && this.emoji === BotConfig.request.ignorePrependResponseMessageEmoji ) {
					if ( origin.member.roles.cache.has( BotConfig.request.oldNotificationsRole ) ) {
						const curTime = new Date();
						const createdTime = origin.createdAt;
						const timeDifference = Math.abs( curTime.getTime() - createdTime.getTime() );
						if ( timeDifference >= BotConfig.request.oldNotificationsTimeDifference ) {
							try {
								await origin.author.send( response, log );
							} catch ( error ) {
								ResolveRequestMessageTask.logger.error( error );
							}
						}
					} else if ( origin.member.roles.cache.has( BotConfig.request.longNotificationsRole ) ) {
						const curTime = new Date();
						const createdTime = origin.createdAt;
						const timeDifference = Math.abs( curTime.getTime() - createdTime.getTime() );
						if ( timeDifference >= BotConfig.request.longNotificationsTimeDifference ) {
							try {
								await origin.author.send( response, log );
							} catch ( error ) {
								ResolveRequestMessageTask.logger.error( error );
							}
						}
					} else {
						try {
							await origin.author.send( response, log );
						} catch ( error ) {
							ResolveRequestMessageTask.logger.error( error );
						}
					}
				}

				if ( origin.member.roles.cache.has( BotConfig.request.specialNotificationsRole ) && this.emoji !== BotConfig.request.ignorePrependResponseMessageEmoji ) {
					if ( origin.member.roles.cache.has( BotConfig.request.oldNotificationsRole ) ) {
						const curTime = new Date();
						const createdTime = origin.createdAt;
						const timeDifference = Math.abs( curTime.getTime() - createdTime.getTime() );
						if ( timeDifference >= BotConfig.request.oldNotificationsTimeDifference ) {
							try {
								await origin.author.send( response, log );
							} catch ( error ) {
								ResolveRequestMessageTask.logger.error( error );
							}
						}
					} else if ( origin.member.roles.cache.has( BotConfig.request.longNotificationsRole ) ) {
						const curTime = new Date();
						const createdTime = origin.createdAt;
						const timeDifference = Math.abs( curTime.getTime() - createdTime.getTime() );
						if ( timeDifference >= BotConfig.request.longNotificationsTimeDifference ) {
							try {
								await origin.author.send( response, log );
							} catch ( error ) {
								ResolveRequestMessageTask.logger.error( error );
							}
						}
					} else {
						try {
							await origin.author.send( response, log );
						} catch ( error ) {
							ResolveRequestMessageTask.logger.error( error );
						}
					}
				}
			}

			if ( BotConfig.request.logChannel ) {
				const logChannel = await DiscordUtil.getChannel( BotConfig.request.logChannel );
				if ( logChannel && logChannel instanceof TextChannel ) {
					const log = new MessageEmbed()
						.setColor( 'GREEN' )
						.setAuthor( { name: origin.author.tag, iconURL: origin.author.avatarURL() } )
						.setDescription( origin.content )
						.addField( 'Message', `[Here](${ origin.url })`, true )
						.addField( 'Channel', origin.channel.toString(), true )
						.addField( 'Created', origin.createdAt.toUTCString(), false )
						.setFooter( { text: `${ this.user.tag } resolved as ${ this.emoji }`, iconURL: this.user.avatarURL() } )
						.setTimestamp( new Date() );

					try {
						if ( BotConfig.request.prependResponseMessageInLog ) {
							const response = RequestsUtil.getResponseMessage( origin );
							await logChannel.send( { content: response, embeds: [log] } );
						} else {
							await logChannel.send( { embeds: [log] } );
						}
					} catch ( error ) {
						ResolveRequestMessageTask.logger.error( error );
					}
				}
			}
		}
	}
}
