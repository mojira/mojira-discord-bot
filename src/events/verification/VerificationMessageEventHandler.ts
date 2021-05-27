import { Guild, Message, MessageEmbed, TextChannel } from 'discord.js';
import * as log4js from 'log4js';
import BotConfig from '../../BotConfig';
import EventHandler from '../EventHandler';
import MojiraBot from '../../MojiraBot';
import DiscordUtil from '../../util/DiscordUtil';

export default class VerificationMessageEventHandler implements EventHandler<'message'> {
	public readonly eventName = 'message';

	private logger = log4js.getLogger( 'VerificationMessageEventHandler' );

	public onEvent = async ( origin: Message ): Promise<void> => {
        const args = origin.content.split(/\s(.+)/)
		if ( args[0] !== "link" || !args[1] ) {
            // This message does not start with 'link' or does not contain a username argument
            return;
        }

        const username = args[1]

        try {
            const allComments = new Map<string, string>();
			const comments = await MojiraBot.jira.issueComments.getComments( { issueIdOrKey: BotConfig.verificationTicket } );
            for ( const comment of comments.comments ) {
				allComments.set( comment.author.name, comment.body );
			}

            const pendingChannel = await DiscordUtil.getChannel( BotConfig.pendingVerificationChannel );
            const logChannel = await DiscordUtil.getChannel( BotConfig.verificationLogChannel );

            if (pendingChannel instanceof TextChannel && logChannel instanceof TextChannel) {

                let foundEmbed = false

                const allMessages = await pendingChannel.messages.fetch({ limit: 100 })

                allMessages.forEach( async message => {

                    const embeds = message.embeds
                    if ( embeds.length == 0 ) return undefined;

                    const userId = embeds[0].fields[0].value.replace(/[<>@!]/g, "")
                    if ( userId !== origin.author.id ) return false;

                    const enteredComment = allComments.get( username )

                    if ( enteredComment === embeds[0].fields[1].value ) {

                        this.logger.info( `Successfully verified user ${ origin.author.tag }` )
                        foundEmbed = true
                        
                        if ( message.deletable ) {
                            try {
                                await message.delete();
                            } catch ( error ) {
                                this.logger.error( error );
                            }
                        } else {
                            this.logger.log( 'Failed to delete message' );
                        }

                        const logEmbed = new MessageEmbed()
                            .setColor( 'GREEN' )
                            .setAuthor( origin.author.tag, origin.author.avatarURL() )
                            .addField( 'Discord', origin.author, true )
                            .addField( 'Mojira', `[${ username }](https://bugs.mojang.com/secure/ViewProfile.jspa?name=${ username })`, true );
                        logChannel.send( logEmbed );

                        const userEmbed = new MessageEmbed()
                            .setColor( 'GREEN' )
                            .setTitle( 'Your account has been verified!' )
                            .setDescription( 'You have successfully linked your Mojira and Discord accounts.' );
                        origin.author.send( userEmbed );

                        try {
                            const role = await logChannel.guild.roles.fetch( BotConfig.verifiedRole );
                            const targetUser = message.guild.members.fetch( origin.author.id );
                            
                            (await targetUser).roles.add( role );
                            this.logger.info( `Added role ${ BotConfig.verifiedRole } to user ${ origin.author.tag }` )
                        } catch ( error ) {
                            this.logger.error( error )
                        }
                        
                    } else {
                        this.logger.info( `Failed to verify user ${ origin.author.tag }: Not a match` )
                        try {
                        origin.author.send( `Failed to verify your account!` )
                        } catch ( error ) {
                            this.logger.error( error )
                        }
                        return false;
                    }
                } );

                if ( !foundEmbed ) {
                    try {
                        origin.author.send( 'Failed to verify your account! Did you send `jira verify` first?' )
                    } catch ( error ) {
                        this.logger.error( error )
                    }
                }

            }


        } catch ( error ) {
			this.logger.error( error );
		}
	};
}
