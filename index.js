import 'dotenv/config';
const { botToken, guildId } = process.env;

import { Client, GatewayIntentBits, SlashCommandBuilder } from 'discord.js';
import { inVoiceChannel, leaveVoiceChannel, getVoiceUsers, MINUTES } from './utils/utils.js';
import commands from './commands/index.js';
import { servers } from './utils/utils.js';

export const prefix = process.env.prefix || '-';

if (!botToken) {
	throw new Error('Please provide a bot token!');
}

if (!guildId) {
	throw new Error('Please provide a guild id!');
}

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
	for (const [key, command] of Object.entries(commands)) {
		if (!slashCommands) return;

		if (command.interactionOptions) {
			command.interactionOptions.setName(command.name).setDescription(command.description);
			slashCommands.create(command.interactionOptions);
			continue;
		}

		const data = new SlashCommandBuilder()
			.setName(command.name)
			.setDescription(command.description);

		slashCommands.create(data);
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

	if (message.author.bot || !cmd || cmd[0] !== prefix) return;

	cmd = cmd.substring(1); // remove prefix from command

	const command =
		commands.get(cmd) ||
		Array.from(commands.values()).find((command) => command.aliases.includes(cmd || ''));

	if (!command) {
		message.channel.send('Please enter a valid command!');
		return;
	}

	if (command.permissions?.memberInVoice && !inVoiceChannel(message)) {
		return;
	}

	if (!message.guild) return;

	const server = servers.get(message.guild.id);

	command.command({ message, args: tokens, server });
});

client.on('interactionCreate', (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const { commandName } = interaction;
	const command = commands.get(commandName);
	if (!command) return;

	if (command.permissions?.memberInVoice && !inVoiceChannel(interaction)) {
		return;
	}

	if (!interaction.guildId) return;

	const server = servers.get(interaction.guildId);

	command.interaction({ interaction, server });
});

client.login(botToken);
