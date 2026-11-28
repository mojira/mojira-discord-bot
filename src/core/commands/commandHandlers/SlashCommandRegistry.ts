import BugCommand from '../../../modules/mentions/BugCommand.js';
import HelpCommand from '../HelpCommand.js';
import MooCommand from '../MooCommand.js';
import ModmailCommand from '../../../modules/modmail/ModmailCommand.js';
import PingCommand from '../PingCommand.js';
import PollCommand from '../PollCommand.js';
import SearchCommand from '../../../modules/mentions/SearchCommand.js';
import SendCommand from '../SendCommand.js';
import ShutdownCommand from '../ShutdownCommand.js';
import TipsCommand from '../TipsCommand.js';

export default {
	BUG_COMMAND: new BugCommand(),
	HELP_COMMAND: new HelpCommand(),
	MODMAIL_COMMAND: new ModmailCommand(),
	MOO_COMMAND: new MooCommand(),
	PING_COMMAND: new PingCommand(),
	POLL_COMMAND: new PollCommand(),
	SEARCH_COMMAND: new SearchCommand(),
	SEND_COMMAND: new SendCommand(),
	SHUTDOWN_COMMAND: new ShutdownCommand(),
	TIPS_COMMAND: new TipsCommand(),
};
