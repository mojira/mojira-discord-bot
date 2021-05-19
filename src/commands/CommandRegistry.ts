import BugCommand from './BugCommand';
import BulkCommand from './BulkCommand';
import HelpCommand from './HelpCommand';
import PingCommand from './PingCommand';
import MooCommand from './MooCommand';
import MentionCommand from './MentionCommand';
import PollCommand from './PollCommand';
import SendCommand from './SendCommand';
import SearchCommand from './SearchCommand';
import ShutdownCommand from './ShutdownCommand';
import TipsCommand from './TipsCommand';

export default class CommandRegistry {
	public static BUG_COMMAND = new BugCommand();
	public static BULK_COMMAND = new BulkCommand();
	public static HELP_COMMAND = new HelpCommand();
	public static MENTION_COMMAND = new MentionCommand();
	public static MOO_COMMAND = new MooCommand();
	public static PING_COMMAND = new PingCommand();
	public static POLL_COMMAND = new PollCommand();
	public static SEND_COMMAND = new SendCommand();
	public static SEARCH_COMMAND = new SearchCommand();
	public static SHUTDOWN_COMMAND = new ShutdownCommand();
	public static TIPS_COMMAND = new TipsCommand();
}
