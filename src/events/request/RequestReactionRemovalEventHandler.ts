import { MessageReaction, PartialMessageReaction, PartialUser, TextChannel, User } from 'discord.js';
import log4js from 'log4js';
import DiscordUtil from '../../util/DiscordUtil.js';
import EventHandler from '../EventHandler.js';

export default class RequestReactionRemovalEventHandler implements EventHandler<'messageReactionAdd'> {
	public readonly eventName = 'messageReactionAdd';

	private logger = log4js.getLogger( 'RequestReactionRemovalEventHandler' );

	// This syntax is used to ensure that `this` refers to the `RequestResolveEventHandler` object
	public onEvent = async ( reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser ): Promise<void> => {
		const message = await DiscordUtil.fetchMessage( reaction.message );

		this.logger.info( `User ${ user.tag } added '${ reaction.emoji.name }' reaction to request message '${ message.id }'` );
		const guild = message.guild;
		if ( guild === null ) return;

		user = await DiscordUtil.fetchUser( user );
		const guildMember = guild.members.resolve( user );

		if ( guildMember && !guildMember.permissionsIn( message.channel as TextChannel ).has( 'AddReactions' ) ) {
			await reaction.users.remove( user );
		}
	};
}
