import { GuildMember } from 'discord.js';
import Permission from './Permission.js';
import BotConfig from '../BotConfig.js';

export default class OwnerPermission extends Permission {
	public checkPermission( member?: GuildMember ): boolean {
		return member ? BotConfig.owners.includes( member.id ) : false;
	}
}
