![Discord music, a Discord bot that plays music](./docs/discord-music-dark.png#gh-dark-mode-only)
![Discord music, a Discord bot that plays music](./docs/discord-music-light.png#gh-light-mode-only)

# Discord Music

A Discord bot that plays music

## Adding the bot to your server

To add the bot to your Discord server, follow these steps:

1.  **Navigate to the [Discord Developer Portal](https://discord.com/developers/applications).**
2.  **Select your application.**
3.  Under the "OAuth2" > "URL Generator" section, select the `bot` and `applications.commands` scopes.
4.  A URL will be generated at the bottom of the page. Copy this URL and paste it into your browser.
5.  Select the server you want to add the bot to and click "Authorize".
6.  Back in the Discord Developer Portal, go to the "Bot" page.
7.  Under "Privileged Gateway Intents", ensure "Message Content Intent" is enabled if your bot needs to read message content.
8.  Under "Bot Permissions", grant the bot "Administrator" rights. Alternatively, you can enable all necessary voice and text-related permissions individually for more granular control.

## Features

- Play, pause, queue and skip songs
- Slash commands

### Commands

- `play <song>`: play a song
- `pause`: pause the current song
- `unpause`: resume the current song
- `skip`: skip the current song
- `queue`: show the current queue
- `leave`: leave the voice channel

## Instalation

1. clone the project
2. open the project directory
3. run `pnpm install`
4. start the bot using `pnpm start` or `npm run start`

<!-- command removal notes

```js
// local
let coms = await guild.commands.fetch();
await coms.forEach(async (com) => {
  await com.delete();
});

// global
await client.application.commands.set([]); // clear all global commands
console.log(await client.api.applications(client.user.id).commands.get()); //
``` -->

## Setup

First of all make sure you have rust installed

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

make sure you have the following installed

```bash
sudo apt update
sudo apt install build-essential libc6-dev cmake pkg-config libopus-dev
```

### yt-dlp

This bot uses yt-dlp to search and download songs.
For installation instructions, please refer to the [official yt-dlp installation guide](https://github.com/yt-dlp/yt-dlp/wiki/Installation).

> [!NOTE]  
> When installing yt-dlp through pip, you might need to add the following to your `.bashrc` / `.zshrc`
>
> ```
> export PATH="$HOME/.local/bin:$PATH"
> ```

## TODO

- Add a docker file to run the bot
