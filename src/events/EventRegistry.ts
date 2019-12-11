import EventHandler from './EventHandler';
import { Client } from 'discord.js';

export default class EventRegistry {
	private static client: Client;

	public static add( handler: EventHandler ): void {
		if ( this.client == undefined ) {
			throw 'Event handlers cannot be added to a nonexisting Discord client';
		}

		this.client.on( handler.eventName, handler.onEvent );
	}

	public static setClient( client: Client ): void {
		this.client = client;
	}
}