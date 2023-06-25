import { MessageReaction, Snowflake, User } from 'discord.js';
import log4js from 'log4js';
import EventHandler from '../EventHandler.js';
import DiscordUtil from '../../util/DiscordUtil.js';

export default class MentionDeleteEventHandler implements EventHandler<'messageReactionAdd'> {
	public readonly eventName = 'messageReactionAdd';

	private logger = log4js.getLogger( 'MentionDeleteEventHandler' );

	private botUserId: Snowflake;
	constructor( botUserId: Snowflake ) {
		this.botUserId = botUserId;
	}

	public onEvent = async ( reaction: MessageReaction, user: User ): Promise<void> => {
		const message = reaction.message;

		this.logger.info(
			`User ${ DiscordUtil.getUserHandle( user ) } is attempting to delete message '${ message.id }'`
		);

		// Only delete own messages
		if ( message.author?.id !== this.botUserId ) return;

		// Check whether the footer of the message's embed matches the user's handle
		const footer = message.embeds[0]?.footer?.text;
		if ( footer === undefined ) return;

		if ( DiscordUtil.getUserHandle( user ) === footer ) {
			try {
				this.logger.info( `Removing message '${ message.id }'` );
				await message.delete();
			} catch ( error ) {
				this.logger.error( error );
			}
		} else {
			this.logger.info( `Message '${ message.id }' was not removed; no permission` );
			await reaction.remove();
		}
	};
}
