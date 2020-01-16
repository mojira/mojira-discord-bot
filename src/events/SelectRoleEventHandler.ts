import { User, MessageReaction } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from '../BotConfig';
import EventHandler from './EventHandler';

export default class SelectRoleEventHandler implements EventHandler {
	public readonly eventName = '';

	private logger = log4js.getLogger( 'SelectRoleEventHandler' );

	// This syntax is used to ensure that `this` refers to the `SelectRoleEventHandler` object
	public onEvent = ( messageReaction: MessageReaction, user: User ): void => {
		this.logger.info( `User ${ user.tag } added '${ messageReaction.emoji.name }' reaction to role message` );

		const role = BotConfig.roles.find( searchedRole => searchedRole.emoji === messageReaction.emoji.id );

		if ( !role ) {
			messageReaction.remove( user );
			return;
		}

		const member = messageReaction.message.guild.members.get( user.id );
		if ( member ) {
			member.addRole( role.id );
		}
	};
}