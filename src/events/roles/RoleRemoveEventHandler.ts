import { MessageReaction, User } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from '../../BotConfig';
import DiscordUtil from '../../util/DiscordUtil';
import EventHandler from '../EventHandler';

export default class RoleRemoveEventHandler implements EventHandler<'messageReactionRemove'> {
	public readonly eventName = 'messageReactionRemove';

	private logger = log4js.getLogger( 'RoleRemoveEventHandler' );

	// This syntax is used to ensure that `this` refers to the `RoleRemoveEventHandler` object
	public onEvent = async ( messageReaction: MessageReaction, user: User ): Promise<void> => {
		this.logger.info( `User ${ user.tag } removed '${ messageReaction.emoji.name }' reaction from role message` );

		const group = BotConfig.roleGroups.find( searchedGroup => searchedGroup.message === messageReaction.message.id );
		const role = group.roles.find( searchedRole => searchedRole.emoji === messageReaction.emoji.id || searchedRole.emoji === messageReaction.emoji.name );

		if ( !role ) return;

		const member = await DiscordUtil.getMember( messageReaction.message.guild, user.id );
		if ( member ) {
			try {
				await member.roles.remove( role.id );
			} catch ( error ) {
				this.logger.error( error );
			}
		}
	};
}