import EventHandler from './EventHandler';
import { User, MessageReaction } from 'discord.js';
import BotConfig from '../BotConfig';
import * as log4js from 'log4js';

export default class RemoveReactionEventHandler implements EventHandler {
	public readonly eventName = 'messageReactionRemove';

	private readonly botUserId: string;

	private logger = log4js.getLogger( 'RoleDistributor' );

	constructor( botUserId: string ) {
		this.botUserId = botUserId;
	}

	// This syntax is used to ensure that `this` refers to the `MessageEventHandler` object
	public onEvent = ( messageReaction: MessageReaction, user: User ): void => {
		if ( messageReaction.message.id !== BotConfig.rolesMessage || user.id === this.botUserId ) return;

		this.logger.info( `User ${ user.tag } removed '${ messageReaction.emoji.name }' reaction from role message` );

		const role = BotConfig.roles.find( searchedRole => searchedRole.emoji === messageReaction.emoji.id );

		if ( !role ) return;

		const member = messageReaction.message.guild.members.get( user.id );
		if ( member ) {
			member.removeRole( role.id );
		}
	};
}