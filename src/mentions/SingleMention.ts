import { Mention } from './Mention';
import JiraClient = require( 'jira-connector' );
import BotConfig from '../BotConfig';

export default abstract class SingleMention extends Mention {
	protected jira: JiraClient;
	protected ticket: string;

	public get maxUngroupedMentions(): number {
		return BotConfig.maxUngroupedMentions;
	}

	constructor( ticket: string ) {
		super();

		this.ticket = ticket;

		this.jira = new JiraClient( {
			host: 'bugs.mojang.com',
			strictSSL: true,
		} );
	}

	protected findThumbnail( attachments ): string {
		const allowedMimes = [
			'image/png', 'image/jpeg',
		];

		for ( const attachment of attachments ) {
			if ( allowedMimes.includes( attachment.mimeType ) ) return attachment.content;
		}

		return undefined;
	}

	public getTicket(): string {
		return this.ticket;
	}
}
