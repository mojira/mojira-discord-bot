import { GuildMember } from 'discord.js';
import Permission from './Permission';
import BotConfig from '../BotConfig';

export default class OwnerPermission extends Permission {
	public checkPermission( member?: GuildMember ): boolean {
		return member ? BotConfig.owners.includes( member.id ) : false;
	}
}