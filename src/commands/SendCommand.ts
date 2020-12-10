import { Message, MessageEmbed, TextChannel, DMChannel, NewsChannel } from 'discord.js';
import PrefixCommand from './PrefixCommand';
import PermissionRegistry from '../permissions/PermissionRegistry';
import Command from './Command';

export default class ShutdownCommand extends PrefixCommand {
	public readonly permissionLevel = PermissionRegistry.OWNER_PERMISSION;

	public readonly aliases = ['send', 'message'];

	private async sendSyntaxMessage( channel: TextChannel | DMChannel | NewsChannel, additionalInfo?: string ): Promise<void> {
		try {
			await channel.send(
				`${ additionalInfo }Command syntax:
				\`\`\`
				${ PrefixCommand.prefix } send|message [channel]
				text|embed
				[<Message Content>]
				\`\`\``.replace( /\t/g, '' )
			);
		} catch ( err ) {
			Command.logger.error( err );
		}
	}

	public async run( message: Message, args: string ): Promise<boolean> {
		if ( !args.length ) {
			await this.sendSyntaxMessage( message.channel, 'No Arguments Specified ' );
			return false;
		}

		const sendRegex = /^(?:(.*?))?\s(?:(.*?))?\s*((?:\n.*)*)$/;
		const matches = sendRegex.exec( args );

		const channelName = matches ? matches[0] : '';
		const messageType = matches[1] ? matches[2] : '';
		const content = matches[3] ? matches[3].split( '\n' ) : '';
		const sendChannel = message.mentions.channels.first();;

		if ( !channelName || !sendChannel || !messageType || !content ) {
			await this.sendSyntaxMessage( message.channel, 'Field was missing! ' );
			return false;
		}

		if ( message.deletable ) {
			try {
				await message.delete();
			} catch ( err ) {
				Command.logger.error( err );
			}
		}

		if ( sendChannel instanceof TextChannel ) {
			if ( messageType === 'text' ) {
				try {
					await sendChannel.send( content );
				} catch {
					return false;
				}
			} else if ( messageType === 'embed' ) {
				try {
					const embed = new MessageEmbed();
					embed.setDescription( content );
					await sendChannel.send( embed );
				} catch {
					return false;
				}
			} else {
				await this.sendSyntaxMessage( message.channel, `**Error:** ${ messageType } must be text or embed. ` );
				return false;
			}
		} else {
			await this.sendSyntaxMessage( message.channel, `**Error:** ${ channelName } is not a valid channel. ` );
			return false;
		}

		return true;
	}

	public asString( args: string ): string {
		return `!jira send ${ args.split( '\n' )[0] } ${ args.split( '\n' )[1] } [${ args.split( '\n' ).length - 2 } lines in the message]`;
	}
}