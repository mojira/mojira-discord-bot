import BotConfig from '../BotConfig';
import { EmbedConfig } from '../MentionConfig';
import Mention from '../mentions/Mention';
import MultipleMention from '../mentions/MultipleMention';
import CustomMention from '../mentions/CustomMention';
import { RichEmbed, TextChannel, DMChannel, GroupDMChannel } from 'discord.js';
import * as log4js from 'log4js';

export default class MentionUtil {
	public static logger = log4js.getLogger( 'Mention' );

	public static get ticketPattern(): string {
		return `(?:${ BotConfig.projects.join( '|' ) })-\\d+`;
	}

	public static get linkPattern(): string {
		return 'https?:\\/\\/bugs.mojang.com\\/(?:browse|projects\\/\\w+\\/issues)\\/';
	}

	public static get ticketLinkPattern(): string {
		return `${ this.linkPattern }(${ this.ticketPattern })`;
	}

	public static getMentions( tickets: string[], embedType: EmbedConfig, maxUngroupedEmbeds?: number, maxGroupedEmbeds?: number ): Mention[] {
		maxUngroupedEmbeds = maxUngroupedEmbeds != undefined ? maxUngroupedEmbeds : BotConfig.maxUngroupedMentions;

		if ( maxUngroupedEmbeds && tickets.length > maxUngroupedEmbeds ) {
			return [ new MultipleMention( tickets, maxGroupedEmbeds ) ];
		} else {
			const mentions = new Array<Mention>();

			for( const ticket of tickets ) {
				mentions.push( new CustomMention( ticket, embedType ) );
			}

			return mentions;
		}
	}

	public static async sendMentions( mentions: Mention[],
		channel: TextChannel | DMChannel | GroupDMChannel,
		footer?: { text: string; icon: string; timestamp: number | Date },
		message?: string ): Promise<boolean> {

		const embeds = new Array<RichEmbed>();
		let messageText = message;

		for( const mention of mentions ) {
			let embed: RichEmbed;

			try {
				embed = await mention.getEmbed();
			} catch ( err ) {
				try {
					channel.send( err );
				} catch ( err ) {
					this.logger.log( err );
				}
				return false;
			}

			if( embed === undefined ) return false;

			if ( footer ) {
				embed.setFooter( footer.text, footer.icon )
					.setTimestamp( footer.timestamp );
			}
			if ( message && mentions.length == 1 && mention instanceof MultipleMention ) {
				embed.setTitle( message );
				messageText = '';
			}

			embeds.push( embed );
		}

		let error = false;
		if( messageText ) {
			try {
				await channel.send( messageText );
			} catch ( err ) {
				this.logger.error( err );
				error = true;
			}
		}

		for( const embed of embeds ) {
			try {
				await channel.send( embed );
			} catch ( err ) {
				this.logger.error( err );
				error = true;
			}
		}

		return !error;
	}
}