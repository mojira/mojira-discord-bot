import { MessageReaction, TextChannel, User } from 'discord.js';
import * as log4js from 'log4js';
import DiscordUtil from '../../util/DiscordUtil';
import EventHandler from '../EventHandler';

export default class RequestReactionRemovalEventHandler implements EventHandler<'messageReactionAdd'> {
	public readonly eventName = 'messageReactionAdd';

	private logger = log4js.getLogger( 'RequestReactionRemovalEventHandler' );

	// This syntax is used to ensure that `this` refers to the `RequestResolveEventHandler` object
	public onEvent = async ( reaction: MessageReaction, user: User ): Promise<void> => {
		const message = await DiscordUtil.fetchMessage( reaction.message );

		this.logger.info( `User ${ user.tag } added '${ reaction.emoji.name }' reaction to request message '${ message.id }'` );
		const guildMember = message.guild.members.resolve( user );

		if ( !guildMember.permissionsIn( message.channel as TextChannel ).has( 'ADD_REACTIONS' ) ) {
			await reaction.users.remove( user );
		}
	};
}
