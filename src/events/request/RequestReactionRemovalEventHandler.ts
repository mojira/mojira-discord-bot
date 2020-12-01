import { MessageReaction, User } from 'discord.js';
import * as log4js from 'log4js';
import EventHandler from '../EventHandler';

export default class RequestReactionRemovalEventHandler implements EventHandler<'messageReactionAdd'> {
	public readonly eventName = 'messageReactionAdd';

	private logger = log4js.getLogger( 'RequestReactionRemovalEventHandler' );

	// This syntax is used to ensure that `this` refers to the `RequestResolveEventHandler` object
	public onEvent = async ( reaction: MessageReaction, user: User ): Promise<void> => {
		this.logger.info( `User ${ user.tag } added '${ reaction.emoji.name }' reaction to request message '${ reaction.message.id }'` );
                const guildMember = reaction.message.guild.member(user);

                if ( guildMember.permissionsIn(reaction.message.channel) !== 'ADD_REACTIONS' ) {
		     reaction.users.remove(user);
                }
	};
}
