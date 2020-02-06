import { User, MessageReaction } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from '../../BotConfig';
import EventHandler from '../EventHandler';

export default class RemoveRoleEventHandler implements EventHandler {
	public readonly eventName = '';

	private logger = log4js.getLogger( 'RemoveRoleEventHandler' );

	// This syntax is used to ensure that `this` refers to the `RemoveRoleEventHandler` object
	public onEvent = ( messageReaction: MessageReaction, user: User ): void => {
		this.logger.info( `User ${ user.tag } removed '${ messageReaction.emoji.name }' reaction from role message` );

		const role = BotConfig.roles.find( searchedRole => searchedRole.emoji === messageReaction.emoji.id );

		if ( !role ) return;

		const member = messageReaction.message.guild.members.get( user.id );
		if ( member ) {
			member.removeRole( role.id );
		}
	};
}