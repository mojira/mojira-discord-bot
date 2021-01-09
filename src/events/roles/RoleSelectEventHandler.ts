import { MessageReaction, User } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from '../../BotConfig';
import DiscordUtil from '../../util/DiscordUtil';
import EventHandler from '../EventHandler';

export default class RoleSelectEventHandler implements EventHandler<'messageReactionAdd'> {
	public readonly eventName = 'messageReactionAdd';

	private logger = log4js.getLogger( 'RoleSelectEventHandler' );

	// This syntax is used to ensure that `this` refers to the `RoleSelectEventHandler` object
	public onEvent = async ( reaction: MessageReaction, user: User ): Promise<void> => {
		this.logger.info( `User ${ user.tag } added '${ reaction.emoji.name }' reaction to role message` );

		const group = BotConfig.roleGroups.find( searchedGroup => searchedGroup.message === reaction.message.id );
		const role = group.roles.find( searchedRole => searchedRole.emoji === reaction.emoji.id || searchedRole.emoji === reaction.emoji.name );

		if ( !role ) {
			try {
				await reaction.users.remove( user );
			} catch ( error ) {
				this.logger.error( error );
			}
			return;
		}

		const member = await DiscordUtil.getMember( reaction.message.guild, user.id );

		if ( group.radio ) {
			// Remove other reactions.
			for ( const otherReaction of reaction.message.reactions.cache.values() ) {
				if ( otherReaction.emoji.id !== role.emoji ) {
					try {
						await otherReaction.remove();
					} catch ( error ) {
						this.logger.error( error );
					}
				}
			}
			// Remove other roles.
			if ( member ) {
				for ( const { id } of group.roles ) {
					try {
						await member.roles.remove( id );
					} catch ( error ) {
						this.logger.error( error );
					}
				}
			}
		}

		if ( member ) {
			try {
				await member.roles.add( role.id );
			} catch ( error ) {
				this.logger.error( error );
			}
		}
	};
}