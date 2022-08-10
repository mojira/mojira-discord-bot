import { MessageReaction, User } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from '../../BotConfig';
import DiscordUtil from '../../util/DiscordUtil';
import EventHandler from '../EventHandler';

export default class RoleRemoveEventHandler implements EventHandler<'messageReactionRemove'> {
	public readonly eventName = 'messageReactionRemove';

	private logger = log4js.getLogger( 'RoleRemoveEventHandler' );

	// This syntax is used to ensure that `this` refers to the `RoleRemoveEventHandler` object
	public onEvent = async ( reaction: MessageReaction, user: User ): Promise<void> => {
		this.logger.info( `User ${ user.tag } removed '${ reaction.emoji.name }' reaction from role message` );

		const group = BotConfig.roleGroups.find( searchedGroup => searchedGroup.message === reaction.message.id );
		const role = group?.roles.find( searchedRole => searchedRole.emoji === reaction.emoji.id || searchedRole.emoji === reaction.emoji.name );

		if ( !role ) return;

		const guild = reaction.message.guild;
		if ( guild === null ) return;

		const member = await DiscordUtil.getMember( guild, user.id );
		if ( member ) {
			try {
				await member.roles.remove( role.id );
			} catch ( error ) {
				this.logger.error( error );
			}
		}
	};
}
