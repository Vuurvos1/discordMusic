import 'dotenv/config';
const { botToken, guildId } = process.env;
const prefix = process.env.prefix || '-';

import * as fs from 'node:fs';

import { Client, GatewayIntentBits } from 'discord.js';
import { inVoiceChannel, leaveVoiceChannel, getVoiceUsers, MINUTES } from './utils/utils.js';

if (!botToken) {
	throw new Error('Please provide a bot token!');
}

if (!guildId) {
	throw new Error('Please provide a guild id!');
}

/** @type {import('./').Commands} */
const commands = new Map();

/** @type {import('./').CustomClient}  */
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

	// setup text commands
	const commandFiles = fs.readdirSync('./commands/').filter((file) => file.endsWith('.js'));

	// setup slash commands scope
	const slashCommands = guild ? guild.commands : client.application?.commands;

	for (const file of commandFiles) {
		/** @type {{default: import('./').Command}} */
		const { default: command } = await import(`./commands/${file}`);

		// text commands
		commands.set(command.name, command);

		// slash commands
		const commandOptions = {
			name: command.name,
			description: command.description,
			options: command.interactionOptions || command.interactionOptions
		};

		if (!slashCommands) return;

		slashCommands.create(commandOptions);
	}

	client.commands = commands;
});

client.queue = new Map(); // TODO: rename

client.on('reconnecting', () => {
	console.log('Reconnecting!');
});

client.on('disconnect', () => {
	console.log('Disconnect!');
});

client.on('voiceStateUpdate', (oldState, newState) => {
	// disconnect
	if (oldState.channelId && !newState.channelId) {
		if (!client.queue || !client.user) return;

		const guildQueue = client.queue.get(newState.guild.id);

		if (!guildQueue) return;

		// guildqueue can't be empty here????

		// bot was Disconnected
		if (newState.id === client.user.id) {
			if (!guildQueue.textChannel) return;

			// bot gets disconnected from voice channel
			guildQueue.textChannel.send('Left voice channel');
			leaveVoiceChannel(client.queue, newState.guild.id);

			return;
		}

		// other user gets disconnected from voice channel
		if (guildQueue && getVoiceUsers(guildQueue) < 2) {
			setTimeout(() => {
				if (getVoiceUsers(guildQueue) < 2) {
					if (!guildQueue.textChannel) return;

					// Left the voice channel
					guildQueue.textChannel.send('No one in the voice channel');
					leaveVoiceChannel(client.queue, newState.guild.id);
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

			command.command(message, tokens, client);
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

	if (interaction.isCommand()) return;

	command.interaction(interaction, client);
});

client.login(botToken);
