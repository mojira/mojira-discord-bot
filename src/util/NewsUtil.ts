import { Message, NewsChannel } from 'discord.js';
import * as log4js from 'log4js';
import fetch, { Request, Headers } from 'node-fetch';
import BotConfig from '../BotConfig';

export class NewsUtil {
	private static logger = log4js.getLogger( 'NewsUtil' );

	public static async publishMessage( message: Message ): Promise<void> {
		if ( !( message.channel instanceof NewsChannel ) ) return;

		const request = new Request(
			`https://discord.com/api/v6/channels/${ message.channel.id }/messages/${ message.id }/crosspost`,
			{
				method: 'POST',
				headers: new Headers( {
					'Authorization': `Bot ${ BotConfig.token }`,
				} ),
			}
		);

		try {
			await fetch( request );
			this.logger.info( `Crossposted message ${ message.id } in channel ${ message.channel.name } (${ message.channel.id })` );
		} catch ( error ) {
			this.logger.error( error );
		}
	}
}