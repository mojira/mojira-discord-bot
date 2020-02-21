import BugCommand from './BugCommand';
import ConfigCommand from './ConfigCommand';
import HelpCommand from './HelpCommand';
import MentionCommand from './MentionCommand';
import PingCommand from './PingCommand';
import PollCommand from './PollCommand';
import RolesCommand from './RolesCommand';
import ShutdownCommand from './ShutdownCommand';

export default class CommandRegistry {
	public static BUG_COMMAND = new BugCommand();
	public static CONFIG_COMMAND = new ConfigCommand();
	public static HELP_COMMAND = new HelpCommand();
	public static MENTION_COMMAND = new MentionCommand();
	public static PING_COMMAND = new PingCommand();
	public static POLL_COMMAND = new PollCommand();
	public static ROLES_COMMAND = new RolesCommand();
	public static SHUTDOWN_COMMAND = new ShutdownCommand();
}