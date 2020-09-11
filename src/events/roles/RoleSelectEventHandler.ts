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
			try {
				await messageReaction.users.remove( user );
			} catch ( error ) {
				this.logger.error( error );
			}
			return;
		}

		const member = await DiscordUtil.getMember( messageReaction.message.guild, user.id );

		if ( group.radio ) {
			// Remove other reactions.
			for ( const reaction of messageReaction.message.reactions.cache.values() ) {
				if ( reaction.emoji.id !== role.emoji ) {
					try {
						await reaction.remove();
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