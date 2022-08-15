import { ChatInputCommandInteraction, Message, EmbedBuilder } from 'discord.js';
import Command from './commandHandlers/Command.js';
import emojiRegex from 'emoji-regex';
import PermissionRegistry from '../permissions/PermissionRegistry.js';
import { ReactionsUtil } from '../util/ReactionsUtil.js';
import SlashCommand from './commandHandlers/SlashCommand.js';

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

	private async sendSyntaxMessage( interaction: ChatInputCommandInteraction, additionalInfo?: string ): Promise<void> {
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

	private async sendPollMessage( interaction: ChatInputCommandInteraction, title: string, options: PollOption[] ): Promise<void> {
		const embed = new EmbedBuilder();
		embed.setTitle( 'Poll' )
			.setFooter( { text: interaction.user.tag, iconURL: interaction.user.avatarURL() ?? undefined } )
			.setTimestamp( interaction.createdAt )
			.setColor( 'Green' );

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
			embed.addFields( { name: option.emoji, value: option.text, inline: true } );
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

	public async run( interaction: ChatInputCommandInteraction ): Promise<boolean> {
		const pollOptions = interaction.options.getString( 'choices' )?.split( '~' );

		if ( pollOptions == null ) return false;

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

		const title = interaction.options.getString( 'title' );

		if ( title == null ) return false;

		await this.sendPollMessage( interaction, title, options );

		return true;
	}
}
