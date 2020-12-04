import BugCommand from './BugCommand';
import BulkCommand from './BulkCommand';
import HelpCommand from './HelpCommand';
import PingCommand from './PingCommand';
import MooCommand from './MooCommand';
import MentionCommand from './MentionCommand';
import PollCommand from './PollCommand';
import RolesCommand from './RolesCommand';
import ShutdownCommand from './ShutdownCommand';

export default class CommandRegistry {
	public static BUG_COMMAND = new BugCommand();
	public static BULK_COMMAND = new BulkCommand();
	public static HELP_COMMAND = new HelpCommand();
	public static MENTION_COMMAND = new MentionCommand();
	public static MOO_COMMAND = new MooCommand();
	public static PING_COMMAND = new PingCommand();
	public static POLL_COMMAND = new PollCommand();
	public static ROLES_COMMAND = new RolesCommand();
	public static SHUTDOWN_COMMAND = new ShutdownCommand();
}
