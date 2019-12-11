import { RichEmbed } from 'discord.js';
import * as log4js from 'log4js';

export abstract class Mention {
	public static logger = log4js.getLogger( 'Mention' );

	abstract async getEmbed(): Promise<RichEmbed>;
}