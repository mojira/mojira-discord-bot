import { Message, NewsChannel } from 'discord.js';
import * as log4js from 'log4js';

export class NewsUtil {
	private static logger = log4js.getLogger( 'NewsUtil' );

	public static async publishMessage( message: Message ): Promise<void> {
		if ( !( message.channel instanceof NewsChannel ) ) return;

		try {
			await message.crosspost();
			this.logger.info( `Crossposted message ${ message.id } in channel ${ message.channel.name } (${ message.channel.id })` );
		} catch ( error ) {
			this.logger.error( error );
		}
	}
}