import { CommandInteraction, Message, MessageEmbed } from 'discord.js';
import Command from './commandHandlers/Command';
import emojiRegex = require( 'emoji-regex/text.js' );
import PermissionRegistry from '../permissions/PermissionRegistry';
import { ReactionsUtil } from '../util/ReactionsUtil';
import SlashCommand from './commandHandlers/SlashCommand';

interface PollOption {
	emoji: string;
	emojiName?: string;
	rawEmoji: string;
	text: string;
}

export default class PollCommand extends SlashCommand {
	public readonly slashCommandBuilder = this.slashCommandBuilder
		.setName( 'poll' )
		.setDescription( 'Create a poll.' )
		.addStringOption( option =>
			option.setName( 'title' )
				.setDescription( 'The title of the poll.' )
				.setRequired( true )
		)
		.addStringOption( option =>
			option.setName( 'choices' )
				.setDescription( 'The choices to include in the poll, separated by the \'~\' character.' )
				.setRequired( true )
		);


	public readonly permissionLevel = PermissionRegistry.MODERATOR_PERMISSION;

	public readonly aliases = ['poll', 'vote'];

	private async sendSyntaxMessage( interaction: CommandInteraction, additionalInfo?: string ): Promise<void> {
		try {
			if ( additionalInfo != undefined ) {
				additionalInfo += '\n';
			} else {
				additionalInfo = '';
			}

			await interaction.reply( {
				content: `${ additionalInfo }Choice syntax:
				\`\`\`
				<emoji> [<First option name>]~<emoji> [<Second option name>]~...
				\`\`\``.replace( /\t/g, '' ),
				ephemeral: true,
			} );
		} catch ( err ) {
			Command.logger.error( err );
		}
	}

	private async sendPollMessage( interaction: CommandInteraction, title: string, options: PollOption[] ): Promise<void> {
		const embed = new MessageEmbed();
		embed.setTitle( 'Poll' )
			.setFooter( { text: interaction.user.tag, iconURL: interaction.user.avatarURL() } )
			.setTimestamp( interaction.createdAt )
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

		let poll = await interaction.reply( { embeds: [embed], allowedMentions: { parse: [] }, fetchReply: true } );

		if ( poll instanceof Array ) {
			if ( poll.length == 0 ) {
				Command.logger.error( 'No message returned from posted poll message!' );
				return;
			}
			poll = poll[0];
		}

		const reactions = options.map( option => option.rawEmoji );

		if ( poll instanceof Message ) {
			await ReactionsUtil.reactToMessage( poll, reactions );
		}
	}

	public async run( interaction: CommandInteraction ): Promise<boolean> {
		const pollOptions = interaction.options.getString( 'choices' ).split( '~' );

		const options: PollOption[] = [];

		for ( const option of pollOptions ) {
			if ( /^\s*$/.test( option ) ) {
				continue;
			}

			const optionArgs = /^\s*(\S+)\s+(.+)\s*$/.exec( option );

			const customEmoji = /^<a?:(\w+):(\d+)>/;
			const unicodeEmoji = emojiRegex();

			if ( !optionArgs ) {
				await this.sendSyntaxMessage( interaction, 'Incorrect choice syntax.' );
				return true;
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
			} else {
				await this.sendSyntaxMessage( interaction, `**Error:** ${ emoji } is not a valid emoji.` );
				return true;
			}
		}

		await this.sendPollMessage( interaction, interaction.options.getString( 'title' ), options );

		return true;
	}
}
