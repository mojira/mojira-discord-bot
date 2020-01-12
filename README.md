<!-- shields -->
[![](https://img.shields.io/github/issues/mojira/mojira-discord-bot)](https://github.com/mojira/mojira-discord-bot/issues)
[![](https://img.shields.io/github/stars/mojira/mojira-discord-bot)](https://github.com/mojira/mojira-discord-bot/stargazers)
[![](https://img.shields.io/github/license/mojira/mojira-discord-bot)](https://github.com/mojira/mojira-discord-bot/blob/master/LICENSE.md)

# Mojira Discord Bot

<!-- PROJECT LOGO -->
<br/>
<p align="center">
  <a href="https://bugs.mojang.com/">
    <img src="mojira-bot.png" alt="MojiraBot" width="80" height="80">
  </a>

  <h3 align="center">MojiraBot</h3>

  <p align="center">
    A Discord bot for linking to Mojira tickets and various server moderation tasks.
    <br/>
    <a href="https://github.com/mojira/mojira-discord-bot/issues">Report Bug</a>
    ·
    <a href="https://github.com/mojira/mojira-discord-bot/issues">Request Feature</a>
  </p>
</p>

## About the project
MojiraBot was written by [violine1101](https://github.com/violine1101) for use with [Node.js](https://nodejs.org), first in a single JavaScript file and later in [TypeScript](https://github.com/Microsoft/TypeScript/). Its purpose is to link to Mojira tickets and provide information about them inside of Discord. It also provides some moderation tools.

## Installation

If you want to tinker around with the project on your local PC, you can simply go ahead, clone the project and install needed dependecies with NPM.

```
git clone https://github.com/mojira/mojira-discord-bot.git
```

```
npm install
```

To run the bot, you need to run the following command:
```
npm run bot
```

## Built with

This project depends on the following projects, thanks to every developer who makes their code open-source! :heart:

- [TypeScript by Microsoft](https://github.com/Microsoft/TypeScript/)
- [discord.js by a lot of talented people](https://github.com/discordjs/discord.js/)
- [jira-connector by floralvikings](https://github.com/floralvikings/jira-connector)
- [moment by marwahaha](https://github.com/moment/moment)
- [log4js by csausdev](https://github.com/log4js-node/log4js-node)

## Contributing

You're very welcome to contribute to this project! Please note that this project uses [TypeScript ESLint](https://github.com/typescript-eslint/typescript-eslint/) to ensure consistent code, you can execute `npm run lint` to fix lint warnings and errors automatically.

## Found a bug in Minecraft?

Please head over to [bugs.mojang.com](https://bugs.mojang.com), search whether your bug is already reported and if not, create an account and click the red "Create" button on the top of the page.

## License

Distributed under the GNU General Public License v3.0. See `LICENSE.md` for more information.
