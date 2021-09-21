import * as log4js from 'log4js';
import { MessageEmbed, TextChannel } from 'discord.js';
import { RoleGroupConfig } from '../BotConfig';
import MojiraBot from '../MojiraBot';
import { ReactionsUtil } from './ReactionsUtil';
import DiscordUtil from './DiscordUtil';

export class RoleSelectionUtil {
	private static logger = log4js.getLogger( 'RoleSelectionUtil' );

	public static async updateRoleSelectionMessage( groupConfig: RoleGroupConfig ): Promise<void> {
		const embed = new MessageEmbed();
		embed.setTitle( groupConfig.prompt )
			.setColor( groupConfig.color );

		if ( groupConfig.desc ) {
			embed.setDescription( groupConfig.desc );
		}

		for ( const role of groupConfig.roles ) {
			const emoji = MojiraBot.client.emojis.resolve( role.emoji ) ?? role.emoji;

			embed.addField( `${ emoji.toString() }\u2002${ role.title }`, role.desc ?? '\u200b' );
		}

		const channel = await DiscordUtil.getChannel( groupConfig.channel );

		if ( !( channel instanceof TextChannel ) ) {
			throw new Error( `Channel ${ groupConfig.channel } is not a text channel` );
		}

		let message = await DiscordUtil.getMessage( channel, groupConfig.message );

		if ( groupConfig.message === undefined || message === undefined ) {
			message = await channel.send( embed );

			// TODO: Ideally we would like to save the message ID automagically.
			this.logger.warn( `Please set the 'message' for role selection group '${ groupConfig.prompt }' to '${ message.id }' in the config.` );
		} else {
			if ( message.embeds.length == 1 ) {
				const existingEmbed = message.embeds[0];

				if ( this.areEmbedsEqual( embed, existingEmbed ) ) {
					return;
				}
			}

			await message.edit( embed );
		}

		await ReactionsUtil.reactToMessage( message, groupConfig.roles.map( role => role.emoji ) );
	}

	private static areEmbedsEqual( embedA: MessageEmbed, embedB: MessageEmbed ): boolean {
		if ( embedA.title !== embedB.title ) {
			this.logger.debug( `Title doesn't match ('${ embedA.title }' !== '${ embedB.title }')` );
			return false;
		}
		if ( embedA.description !== embedB.description ) {
			this.logger.debug( `Description doesn't match ('${ embedA.description }' !== '${ embedB.description }')` );
			return false;
		}
		if ( embedA.hexColor !== embedB.hexColor ) {
			this.logger.debug( `Color doesn't match (${ embedA.hexColor } !== ${ embedB.hexColor })` );
			return false;
		}
		if ( embedA.fields.length !== embedB.fields.length ) {
			this.logger.debug( `Amount of fields doesn't match (${ embedA.fields.length } !== ${ embedB.fields.length })` );
			return false;
		}

		return embedA.fields.every( ( fieldA, i ) => {
			const fieldB = embedB.fields[i];
			if ( fieldA.name !== fieldB.name ) {
				this.logger.debug( `Field name doesn't match ('${ fieldA.name }' !== '${ fieldB.name }')` );
				return false;
			}
			if ( fieldA.value !== fieldB.value ) {
				this.logger.debug( `Field value doesn't match ('${ fieldA.value }' !== '${ fieldB.value }')` );
				return false;
			}
			return true;
		} );
	}
}
