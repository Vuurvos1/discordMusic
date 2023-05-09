import 'dotenv/config';
const { botToken, guildId } = process.env;

import { Client, GatewayIntentBits } from 'discord.js';
import { inVoiceChannel, leaveVoiceChannel, getVoiceUsers, MINUTES } from './utils/utils.js';
import * as comms from './commands/index.js';
import { servers } from './utils/utils.js';

export const prefix = process.env.prefix || '-';

if (!botToken) {
	throw new Error('Please provide a bot token!');
}

if (!guildId) {
	throw new Error('Please provide a guild id!');
}

/** @type {Map<string, import('./').Command>} */
export let commands = new Map();

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildVoiceStates
	]
});

client.on('ready', async () => {
	console.log('Ready!');

	const guild = client.guilds.cache.get(guildId);

	// setup slash commands scope
	const slashCommands = guild ? guild.commands : client.application?.commands;

	// setup  commands
	for (const [key, command] of Object.entries(comms)) {
		// text commands
		commands.set(command.name, command);

		if (!slashCommands) return;

		// slash commands
		const commandOptions = {
			name: command.name,
			description: command.description,
			options: command.interactionOptions || command.interactionOptions
		};

		slashCommands.create(commandOptions);
	}
});

client.on('reconnecting', () => {
	console.log('Reconnecting!');
});

client.on('disconnect', () => {
	console.log('Disconnect!');
});

client.on('voiceStateUpdate', (oldState, newState) => {
	// disconnect
	if (oldState.channelId && !newState.channelId) {
		if (!client.user) return;

		const guildQueue = servers.get(newState.guild.id);
		if (!guildQueue) return;

		// bot was Disconnected
		if (newState.id === client.user.id) {
			if (!guildQueue.textChannel) return;

			// bot gets disconnected from voice channel
			guildQueue.textChannel.send('Left voice channel');
			leaveVoiceChannel(newState.guild.id);

			return;
		}

		// other user gets disconnected from voice channel
		if (guildQueue && getVoiceUsers(guildQueue) < 2) {
			setTimeout(() => {
				if (getVoiceUsers(guildQueue) < 2) {
					if (!guildQueue.textChannel) return;

					// Left the voice channel
					guildQueue.textChannel.send('No one in the voice channel');
					leaveVoiceChannel(newState.guild.id);
				}
			}, 5 * MINUTES);
		}
	}
});

client.on('messageCreate', (message) => {
	// command handeler
	const tokens = message.content.split(' ');
	let cmd = tokens.shift();

	if (!cmd) return;

	if (!message.author.bot && cmd[0] === prefix) {
		cmd = cmd.substring(1); // remove prefix from command

		const command =
			commands.get(cmd) ||
			Array.from(commands.values()).find((command) => command.aliases.includes(cmd || ''));

		if (command) {
			if (command.permissions?.memberInVoice && !inVoiceChannel(message)) {
				return;
			}

			if (!message.guild) return;

			const server = servers.get(message.guild.id);

			command.command({ message, args: tokens, client, server });
		} else {
			message.channel.send('Please enter a valid command!');
		}
	}
});

client.on('interactionCreate', (interaction) => {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;
	const command = commands.get(commandName);

	if (!command || !interaction.isCommand()) return;

	if (command.permissions?.memberInVoice && !inVoiceChannel(interaction)) {
		return;
	}

	command.interaction({ interaction, client });
});

client.login(botToken);
