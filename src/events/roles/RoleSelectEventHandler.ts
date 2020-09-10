import { MessageReaction, User } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from '../../BotConfig';
import DiscordUtil from '../../util/DiscordUtil';
import EventHandler from '../EventHandler';

export default class RoleSelectEventHandler implements EventHandler<'messageReactionAdd'> {
	public readonly eventName = 'messageReactionAdd';

	private logger = log4js.getLogger( 'RoleSelectEventHandler' );

	// This syntax is used to ensure that `this` refers to the `RoleSelectEventHandler` object
	public onEvent = async ( messageReaction: MessageReaction, user: User ): Promise<void> => {
		this.logger.info( `User ${ user.tag } added '${ messageReaction.emoji.name }' reaction to role message` );

		const group = BotConfig.roleGroups.find( searchedGroup => searchedGroup.message === messageReaction.message.id );
		const role = group.roles.find( searchedRole => searchedRole.emoji === messageReaction.emoji.id || searchedRole.emoji === messageReaction.emoji.name );

		if ( !role ) {
			messageReaction.users.remove( user );
			return;
		}

		const member = await DiscordUtil.getMember( messageReaction.message.guild, user.id );

		if ( group.radio ) {
			// Remove other reactions.
			for ( const reaction of messageReaction.message.reactions.cache.values() ) {
				if ( reaction.emoji.id !== role.emoji ) {
					reaction.remove();
				}
			}
			// Remove other roles.
			if ( member ) {
				for ( const { id } of group.roles ) {
					member.roles.remove( id );
				}
			}
		}

		if ( member ) {
			member.roles.add( role.id );
		}
	};
}