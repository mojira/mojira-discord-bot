import { MessageReaction, User } from 'discord.js';
import * as log4js from 'log4js';
import EventHandler from '../EventHandler';

export default class MentionDeleteEventHandler implements EventHandler<'messageReactionAdd'> {
	public readonly eventName = 'messageReactionAdd';

	private logger = log4js.getLogger( 'MentionDeleteEventHandler' );

	public onEvent = async ( { message }: MessageReaction, user: User ): Promise<void> => {
		this.logger.info( `User ${ user.tag } is attempting to delete message '${ message.id }'` );

		const footer = message.embeds[0]?.footer?.text;
		if ( footer === undefined ) return;

		const userTag = footer.match( /.{3,32}#[0-9]{4}/ );

		if ( userTag !== null && user.tag === userTag[0] ) {
			try {
				await message.delete();
			} catch ( error ) {
				this.logger.error( error );
			}
		}
	};
}
