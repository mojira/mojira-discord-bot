import { Message, GuildMember } from 'discord.js';
import Permission from '../permissions/Permission';
import PermissionRegistry from '../permissions/PermissionRegistry';
import * as log4js from 'log4js';

/**
 * Interface for bot commands
 *
 * @author violine1101
 * @since 2019-12-04
 */
export default abstract class Command<T> {
	public static logger = log4js.getLogger( 'CommandExecutor' );

	public readonly permissionLevel: Permission = PermissionRegistry.ANY_PERMISSION;

	public checkPermission( member: GuildMember ): boolean {
		return this.permissionLevel.checkPermission( member );
	}

	/**
	 * @returns `false` if this is not a valid command
	 * @returns `true` if it is a valid command but doesn't have any arguments
	 * @returns string (or list) of arguments if it is a valid command
	 *
	 * @param messageText The text that came with the message
	 */
	public abstract test( messageText: string ): boolean | T;
	public abstract async run( message: Message, args: T ): Promise<boolean>;

	public abstract asString( args: string | T ): string;
}
