import { MessageEmbed } from 'discord.js';
import log4js from 'log4js';

export abstract class Mention {
	public static logger = log4js.getLogger( 'Mention' );

	abstract getEmbed(): Promise<MessageEmbed>;
}
