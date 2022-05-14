import BugCommand from '../BugCommand';
import HelpCommand from '../HelpCommand';
import PingCommand from '../PingCommand';
import MooCommand from '../MooCommand';
import PollCommand from '../PollCommand';
import SearchCommand from '../SearchCommand';
import SendCommand from '../SendCommand';
import ShutdownCommand from '../ShutdownCommand';
import TipsCommand from '../TipsCommand';

export default class SlashCommandRegistry {
	public static BUG_COMMAND = new BugCommand();
	public static HELP_COMMAND = new HelpCommand();
	public static MOO_COMMAND = new MooCommand();
	public static PING_COMMAND = new PingCommand();
	public static POLL_COMMAND = new PollCommand();
	public static SEARCH_COMMAND = new SearchCommand();
	public static SEND_COMMAND = new SendCommand();
	public static SHUTDOWN_COMMAND = new ShutdownCommand();
	public static TIPS_COMMAND = new TipsCommand();
}
