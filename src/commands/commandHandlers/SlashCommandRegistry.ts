import BugCommand from '../BugCommand.js';
import HelpCommand from '../HelpCommand.js';
import PingCommand from '../PingCommand.js';
import MooCommand from '../MooCommand.js';
import PollCommand from '../PollCommand.js';
import SearchCommand from '../SearchCommand.js';
import SendCommand from '../SendCommand.js';
import ShutdownCommand from '../ShutdownCommand.js';
import TipsCommand from '../TipsCommand.js';

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
