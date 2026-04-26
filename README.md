![Discord music, a Discord bot that plays music](./docs/discord-music-dark.png#gh-dark-mode-only)
![Discord music, a Discord bot that plays music](./docs/discord-music-light.png#gh-light-mode-only)

# Discord Music

A Discord bot that plays music

### Commands

- `clear`: clear the queue
- `leave`: leave the voice channel
- `pause`: pause the current song
- `play <song>`: play a song, this can be a YouTube / SoundCloud / Spotify URL or a search query
- `queue`: show the current queue
- `resume`: resume the current song
- `shuffle`: shuffle the queue
- `skip`: skip the current song
- `stop`: stop the current song and clear the queue

## Setup and instalation

### Rust

First of all make sure you have Rust installed. You can find the official installation guide [here](https://www.rust-lang.org/tools/install).

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

> [!NOTE]
> You might need to add the following if you are using linux
>
> ```bash
> sudo apt update
> sudo apt install build-essential libc6-dev cmake pkg-config libopus-dev
> ```

### yt-dlp

This bot uses yt-dlp to search and stream audio.
For installation instructions, you can refer to the [official yt-dlp installation guide](https://github.com/yt-dlp/yt-dlp/wiki/Installation).

> [!NOTE]  
> When installing yt-dlp through pip, you might need to add the following to your `.bashrc` / `.zshrc`
>
> ```
> export PATH="$HOME/.local/bin:$PATH"
> ```

### Spotify (optional)

Spotify URL playback is optional. If you want users to be able to queue Spotify tracks, playlists, or albums, create an app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and set the following environment variables:

```
SPOTIFY_CLIENT_ID=<your client id>
SPOTIFY_CLIENT_SECRET=<your client secret>
```

Spotify tracks are played by searching for them on YouTube via `yt-dlp`. If these variables are not set, the bot still runs normally

### Adding the bot to your server

1.  **Navigate to the [Discord Developer Portal](https://discord.com/developers/applications).**
2.  **Select your application.**
3.  Under the "OAuth2" > "URL Generator" section, select the `bot` and `applications.commands` scopes.
4.  A URL will be generated at the bottom of the page. Copy this URL and paste it into your browser.
5.  Select the server you want to add the bot to and click "Authorize".
6.  Back in the Discord Developer Portal, go to the "Bot" page.
7.  Under "Privileged Gateway Intents", ensure "Message Content Intent" is enabled if your bot needs to read message content.
8.  Under "Bot Permissions", grant the bot "Administrator" rights. Alternatively, you can enable all necessary voice and text-related permissions individually for more granular control.

### Environment variables

Copy the `.env.example` file to `.env` and fill in the values.
