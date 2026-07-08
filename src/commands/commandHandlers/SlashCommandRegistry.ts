import BugCommand from '../BugCommand.js';
import HelpCommand from '../HelpCommand.js';
import MooCommand from '../MooCommand.js';
import ModmailBanCommand from '../ModmailBanCommand.js';
import ModmailUnbanCommand from '../ModmailUnbanCommand.js';
import PingCommand from '../PingCommand.js';
import PollCommand from '../PollCommand.js';
import SearchCommand from '../SearchCommand.js';
import SendCommand from '../SendCommand.js';
import ShutdownCommand from '../ShutdownCommand.js';
import TipsCommand from '../TipsCommand.js';

export default {
	BUG_COMMAND: new BugCommand(),
	HELP_COMMAND: new HelpCommand(),
	MODMAIL_BAN_COMMAND: new ModmailBanCommand(),
	MODMAIL_UNBAN_COMMAND: new ModmailUnbanCommand(),
	MOO_COMMAND: new MooCommand(),
	PING_COMMAND: new PingCommand(),
	POLL_COMMAND: new PollCommand(),
	SEARCH_COMMAND: new SearchCommand(),
	SEND_COMMAND: new SendCommand(),
	SHUTDOWN_COMMAND: new ShutdownCommand(),
	TIPS_COMMAND: new TipsCommand(),
};
