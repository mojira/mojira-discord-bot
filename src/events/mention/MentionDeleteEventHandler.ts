import { MessageReaction, User } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from '../../BotConfig';
import EventHandler from '../EventHandler';

export default class MentionDeleteEventHandler implements EventHandler<'messageReactionAdd'> {
    public readonly eventName = 'messageReactionAdd';

    private logger = log4js.getLogger( 'MentionDeleteEventHandler' );

    public onEvent = async ( { message }: MessageReaction, user: User ): Promise<void> => {
        this.logger.info( `User ${ user.tag } is deleting message '${ message.id }'` );

		const embeds = message.embeds;
		if ( embeds.length == 0 ) {
			try {
				const warning = await message.channel.send( `${ message.author }, this is not a valid embed.` );

				const timeout = BotConfig.request.noLinkWarningLifetime;
				await warning.delete( { timeout } );
			} catch ( error ) {
				this.logger.error( error );
			}
        }

        const mentionEmbed = embeds[0];
        const footer: string = mentionEmbed.footer.text;
        const userTag = footer.match( /\S+#\d{4}/ )[0];

        if ( user.tag === userTag ) {
            try {
                await message.delete;
            } catch ( error ) {
                this.logger.error( error );
            }
        }
    }
}