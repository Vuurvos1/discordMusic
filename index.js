require('dotenv').config();
const { botToken, guildId } = process.env;
const prefix = process.env.prefix || '-';

const fs = require('fs');

const { Intents, Client, Collection } = require('discord.js');
const {
  inVoiceChannel,
  leaveVoiceChannel,
  getVoiceUsers,
  MINUTES,
} = require('./utils/utils');

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

  const guild = client.guilds.cache.get(guildId);
  let commands;

  if (guild) {
    commands = guild.commands;
  } else {
    commands = client.application?.commands;
  }

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);

    const commandOptions = {
      name: command.name,
      description: command.description,
    };

    if (command.interactionOptions) {
      commandOptions.options = command.interactionOptions;
    }

    commands.create(commandOptions);
  }
});

client.queue = new Map();

client.on('reconnecting', () => {
  console.log('Reconnecting!');
});

client.on('disconnect', () => {
  console.log('Disconnect!');
});

client.on('voiceStateUpdate', (oldState, newState) => {
  // Disconnect
  if (oldState.channelId && !newState.channelId) {
    const guildQueue = client.queue.get(newState.guild.id);

    // Bot was Disconnected
    if (newState.id === client.user.id) {
      // bot gets disconnected from voice channel
      if (guildQueue) {
        leaveVoiceChannel(client.queue, newState.guild.id);
      }
    } else {
      // user gets disconnected from voice channel
      if (getVoiceUsers(guildQueue) < 2) {
        setTimeout(() => {
          if (getVoiceUsers(guildQueue) < 2) {
            leaveVoiceChannel(client.queue, newState.guild.id);
            // Left the voice channel
          }
        }, 3 * MINUTES);
      }
    }
  }
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
      if (command.permissions?.memberInVoice) {
        if (!inVoiceChannel(message)) {
          return;
        }
      }

      command.command(message, tokens, client);
    } else {
      message.channel.send('Please enter a valid command!');
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) {
    return;
  }

  const { commandName } = interaction;
  const command = commands.get(commandName);

  if (command.permissions?.memberInVoice) {
    if (!inVoiceChannel(interaction)) {
      return;
    }
  }

  if (!command || !command?.interaction) {
    return;
  }

  command.interaction(interaction, client);
});

client.login(botToken);
