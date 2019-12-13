import PrefixCommand from './PrefixCommand';
import { Message, TextChannel, DMChannel, GroupDMChannel, RichEmbed } from 'discord.js';
import Command from './Command';
import emojiRegex = require( 'emoji-regex/text.js' );
import PermissionRegistry from '../permissions/PermissionRegistry';
import { ReactionsUtil } from '../util/ReactionsUtil';

interface PollOption {
	emoji: string;
	emojiName?: string;
	rawEmoji: string;
	text: string;
}

export default class PollCommand extends PrefixCommand {
	public readonly permissionLevel = PermissionRegistry.MODERATOR_PERMISSION;

	public readonly aliases = ['poll', 'vote'];

	private async sendSyntaxMessage( channel: TextChannel | DMChannel | GroupDMChannel, additionalInfo?: string ): Promise<void> {
		try {
			if ( additionalInfo != undefined ) {
				additionalInfo += '\n';
			}
			else {
				additionalInfo = '';
			}

			await channel.send(
				`${ additionalInfo }Command syntax:
				\`\`\`
				${ PrefixCommand.prefix } poll|vote [<poll title>]
				<emoji> [<First option name>]
				<emoji> [<Second option name>]
				...
				\`\`\``.replace( /\t/g, '' )
			);
		}
		catch ( err ) {
			Command.logger.error( err );
		}
	}

	private async sendPollMessage( message: Message, title: string, options: PollOption[] ): Promise<void> {
		const embed = new RichEmbed();
		embed.setTitle( 'Poll' )
			.setFooter( message.author.tag, message.author.avatarURL )
			.setTimestamp( message.createdAt )
			.setColor( 'GREEN' );

		if ( title ) {
			embed.setDescription( title );
		}

		if ( !options.length ) {
			options.push( {
				emoji: '👍',
				rawEmoji: '👍',
				text: 'Yes',
			} );
			options.push( {
				emoji: '👎',
				rawEmoji: '👎',
				text: 'No',
			} );
		}

		for ( const option of options ) {
			embed.addField( option.emoji, option.text, true );
		}

		let poll = await message.channel.send( { embed: embed, disableEveryone: !message.member.hasPermission( 'MENTION_EVERYONE' ) } );

		if ( poll instanceof Array ) {
			if ( poll.length == 0 ) {
				Command.logger.error( 'No message returned from posted poll message!' );
				return;
			}
			poll = poll[0];
		}

		const reactions = options.map( option => option.rawEmoji );

		await ReactionsUtil.reactToMessage( poll, reactions );
	}

	public async run( message: Message, args: string ): Promise<boolean> {
		const pollRegex = /^(?:(.*?))?\s*((?:\n.*)*)$/;
		const pollMatch = pollRegex.exec( args );

		if ( !pollMatch ) {
			await this.sendSyntaxMessage( message.channel, 'Invalid title syntax' );
			return false;
		}

		const pollTitle = pollMatch ? pollMatch[1] : '';
		const pollOptions = pollMatch[2] ? pollMatch[2].split( '\n' ) : '';

		const options: PollOption[] = [];

		for ( const option of pollOptions ) {
			if ( /^\s*$/.test( option ) ) {
				continue;
			}

			const optionArgs = /^\s*(\S+)\s+(.+)\s*$/.exec( option );

			const customEmoji = /^<a?:(\w+):(\d+)>/;
			const unicodeEmoji = emojiRegex();

			if ( !optionArgs ) {
				await this.sendSyntaxMessage( message.channel, 'Invalid options' );
				return false;
			}

			const emoji = optionArgs[1];
			if ( customEmoji.test( emoji ) || unicodeEmoji.test( emoji ) ) {
				let emojiName = emoji;
				let rawEmoji = emoji;
				const emojiMatch = customEmoji.exec( emoji );
				if ( emojiMatch ) {
					emojiName = emojiMatch[1];
					rawEmoji = emojiMatch[2];
				}
				options.push( {
					emoji: emoji,
					emojiName: emojiName,
					rawEmoji: rawEmoji,
					text: optionArgs[2],
				} );
			}
			else {
				await this.sendSyntaxMessage( message.channel, `**Error:** ${ emoji } is not a valid emoji.` );
				return false;
			}
		}

		if ( message.deletable ) {
			try {
				await message.delete();
			}
			catch ( err ) {
				Command.logger.error( err );
			}
		}

		this.sendPollMessage( message, pollTitle, options );

		return true;
	}

	public asString( args: string ): string {
		return `!jira poll ${ args.split( '\n' )[0] } [${ args.split( '\n' ).length - 1 } options]`;
	}
}