import "dotenv/config";
import {
  inVoiceChannel,
  leaveVoiceChannel,
  getVoiceUsers,
  MINUTES,
} from "./utils/utils.js";

const { botToken, guildId } = process.env;
const prefix = process.env.prefix || "-";
const timeout = process.env.timeout || 3;

import * as fs from "node:fs";

import { Intents, Client, Collection } from "discord.js";

const commands = new Collection();

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

client.on("ready", async () => {
  console.log("Ready!");

  const guild = client.guilds.cache.get(guildId);

  // setup text commands
  const commandFiles = fs
    .readdirSync("./commands/")
    .filter((file) => file.endsWith(".js"));

  // setup slash commands scope
  let slashCommands;
  if (guild) {
    slashCommands = guild.commands;
  } else {
    slashCommands = client.application?.commands;
  }

  for (const file of commandFiles) {
    const { default: command } = await import(`./commands/${file}`);

    // text commands
    commands.set(command.name, command);

    // slash commands
    const commandOptions = {
      name: command.name,
      description: command.description,
    };

    if (command.interactionOptions) {
      commandOptions.options = command.interactionOptions;
    }

    slashCommands.create(commandOptions);
  }

  client.commands = commands;
});

client.queue = new Map();

client.on("reconnecting", () => {
  console.log("Reconnecting!");
});

client.on("disconnect", () => {
  console.log("Disconnect!");
});

client.on("voiceStateUpdate", (oldState, newState) => {
  // Disconnect
  if (oldState.channelId && !newState.channelId) {
    const guildQueue = client.queue.get(newState.guild.id);

    // Bot was Disconnected
    if (newState.id === client.user.id) {
      // bot gets disconnected from voice channel
      if (guildQueue) {
        guildQueue.textChannel.send("Left voice channel");
        leaveVoiceChannel(client.queue, newState.guild.id);
      }
    } else {
      // user gets disconnected from voice channel
      if (guildQueue) {
        if (getVoiceUsers(guildQueue) < 2) {
          setTimeout(() => {
            if (getVoiceUsers(guildQueue) < 2) {
              // Left the voice channel
              guildQueue.textChannel.send("No one in the voice channel");
              leaveVoiceChannel(client.queue, newState.guild.id);
            }
          }, timeout * MINUTES);
        }
      }
    }
  }
});

client.on("messageCreate", (message) => {
  // command handeler
  const tokens = message.content.split(" ");
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
      message.channel.send("Please enter a valid command!");
    }
  }
});

client.on("interactionCreate", async (interaction) => {
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
