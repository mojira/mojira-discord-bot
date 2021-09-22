import { MessageEmbed, MessageReaction, User } from 'discord.js';
import * as log4js from 'log4js';
import DiscordUtil from '../../util/DiscordUtil';
import EventHandler from '../EventHandler';
import BotConfig from '../../BotConfig';
import TaskScheduler from '../../tasks/TaskScheduler';

export default class ReplaceVerificationEventHandler implements EventHandler<'messageReactionRemove'> {
	public readonly eventName = 'messageReactionRemove';

	private logger = log4js.getLogger( 'RemoveVerificationEventHandler' );

	public onEvent = async ( reaction: MessageReaction, user: User ): Promise<void> => {
		const message = await DiscordUtil.fetchMessage( reaction.message );
		const verifiedRole = await message.guild.roles.fetch( BotConfig.verification.verifiedRole );

		if ( message.embeds.length == 0 ) return undefined;

		const targetUser = DiscordUtil.getMember( message.guild, message.embeds[0].fields[0].value.replace( /[<>@!]/g, '' ) );

		if ( reaction.emoji.name !== BotConfig.verification.removeLinkEmoji ) {

			this.logger.info( `User ${ user.tag } is replacing the role '${ verifiedRole.name }' for user ${ ( await targetUser ).user.tag }` );

			try {
				const embed = new MessageEmbed( message.embeds[0] )
					.setColor( 'GREEN' )
					.setFooter( 'Reverified' );
				await message.edit( embed );
			} catch ( error ) {
				this.logger.error( error );
			}

		} else {

			this.logger.info( `User ${ user.tag } is cancelling the removal of the linked account of user ${ ( await targetUser ).user.tag }` );

			try {
				const embed = new MessageEmbed( message.embeds[0] )
					.setColor( 'GREEN' )
					.setFooter( 'Link removal cancelled' );
				await message.edit( embed );

				this.logger.info( `Cleared message task for request message '${ message.id }'` );
				TaskScheduler.clearMessageTasks( message );
			} catch ( error ) {
				this.logger.error( error );
			}
		}

		try {
			await ( await targetUser ).roles.add( verifiedRole );
		} catch ( error ) {
			this.logger.error( error );
		}
	};
}