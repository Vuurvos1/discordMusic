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

## TODO

- Add a docker file to run the bot
