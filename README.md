![Discord music, a Discord bot that plays music](./docs/discord-music-dark.png#gh-dark-mode-only)
![Discord music, a Discord bot that plays music](./docs/discord-music-light.png#gh-light-mode-only)

# Discord Music

A Discord bot that plays music

## Adding the bot to your server

In de discord developer portal make sure you have selected `bot` and `applications.commands` under scope

under Bot permissions, turn on administrator rights (or enable all voice and text related permissions)

## Features

- Play, pause, queue and skip songs
- Slash commands

### Commands

- `play <song>`: play a song
- `pause`: pause the current song
- `resume`: resume the current song
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

```
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

make sure you have the following installed

```
sudo apt update
sudo apt install build-essential libc6-dev
sudo apt install cmake build-essential pkg-config libopus-dev
```

### yt-dlp

```
pip install -U "yt-dlp"
```

Note that when you install yt-dlp through pip, you might need to add the following to your `.bashrc`

```
export PATH="$HOME/.local/bin:$PATH"
```

Note that when adding a song to the queue it might take a while to load the song.

## TODO

- Add a docker file to run the bot
