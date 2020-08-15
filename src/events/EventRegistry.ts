import { Client, ClientEvents } from 'discord.js';
import EventHandler from './EventHandler';

export default class EventRegistry {
	private static client: Client;

	public static add<K extends keyof ClientEvents>( handler: EventHandler<K> ): void {
		if ( this.client == undefined ) {
			throw 'Event handlers cannot be added to a nonexisting Discord client';
		}

		this.client.on( handler.eventName, handler.onEvent );
	}

	public static setClient( client: Client ): void {
		this.client = client;
	}
}