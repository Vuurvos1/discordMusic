require('dotenv').config();
const { botToken } = process.env;
const prefix = process.env.prefix || '-';

const fs = require('fs');

const { Intents, Client, Collection } = require('discord.js');

// get command files
const commands = new Collection();
const commandFiles = fs
  .readdirSync('./commands/')
  .filter((file) => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.set(command.name, command);
}

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

client.on('ready', async () => {
  console.log('Ready!');
});

client.queue = new Map();

client.on('reconnecting', () => {
  console.log('Reconnecting!');
});

client.on('disconnect', () => {
  console.log('Disconnect!');
});

client.on('messageCreate', (message) => {
  // command handeler
  const tokens = message.content.split(' ');
  let cmd = tokens.shift();

  if (!message.author.bot && cmd[0] == prefix) {
    // remove prefix from command
    cmd = cmd.substring(1);

    const command =
      commands.get(cmd) ||
      commands.find((a) => a.aliases && a.aliases.includes(cmd));

    if (command) {
      command.command(message, tokens, client);
    } else {
      message.channel.send('Please enter a valid command!');
    }
  }
});

client.login(botToken);
