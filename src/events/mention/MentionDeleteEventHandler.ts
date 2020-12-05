import { MessageReaction, User } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from '../../BotConfig';
import EventHandler from '../EventHandler';

export default class MentionDeleteEventHandler implements EventHandler<'messageReactionAdd'> {
    public readonly eventName = 'messageReactionAdd';

    private logger = log4js.getLogger( 'MentionDeleteEventHandler' );

    public onEvent = async ( { message }: MessageReaction, user: User ): Promise<void> => {
        this.logger.info( `User ${ user.tag } is attempting to delete message '${ message.id }'` );

        let footer: string;

        try {
	        const embeds = message.embeds;
            const mentionEmbed = embeds[0];
            footer = mentionEmbed.footer.text;
        } catch ( error ) {
            this.logger.error( error );
        }

        const userTag = footer.match( /.{3,32}#[0-9]{4}/ )[0];

        if ( user.tag === userTag ) {
            try {
                await message.delete();
            } catch ( error ) {
                this.logger.error( error );
            }
        }
    }
}
