import {
	Client,
	GatewayIntentBits,
	SlashCommandBuilder,
	REST,
	Routes,
	ActivityType
} from 'discord.js';
import { inVoiceChannel, leaveVoiceChannel, getUsersInVoice, MINUTES } from './utils/utils.js';
import commands from './commands/index.js';
import { servers } from './utils/utils.js';

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!TOKEN) throw new Error('Please provide a bot token!');

if (!CLIENT_ID) throw new Error('Please provide a client id!');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildVoiceStates
	]
});

client.on('ready', async () => {
	console.info('Ready!');

	const commandData = [];

	// setup commands
	for (const command of Object.values(commands)) {
		if (command.interactionOptions) {
			commandData.push(command.interactionOptions.toJSON());
			continue;
		}

		const data = new SlashCommandBuilder()
			.setName(command.name)
			.setDescription(command.description);

		commandData.push(data.toJSON());
	}

	const rest = new REST().setToken(TOKEN);

	console.info(`Started refreshing ${commandData.length} application (/) commands.`);
	if (GUILD_ID) {
		const data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
			body: commandData
		});

		// @ts-ignore
		console.info(`Successfully reloaded ${data?.length} application (/) commands.`);

		// clear guild commands
		// guild.commands.set([]);
		// console.log('Commands cleared');
		// const d = await guild.commands.fetch();
		// console.log(d);
	} else {
		// register global commands
		const data = await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

		// @ts-ignore
		console.info(`Successfully reloaded ${data?.length} global application (/) commands.`);
	}

	if (!client.user) return;

	client.user.setPresence({
		status: 'online',
		activities: [
			{
				name: 'Listening to music | /help',
				type: ActivityType.Custom
			}
		]
	});
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
		if (guildQueue && getUsersInVoice(guildQueue) < 2) {
			setTimeout(() => {
				if (getUsersInVoice(guildQueue) < 2) {
					if (!guildQueue.textChannel) return;

					// Left the voice channel
					guildQueue.textChannel.send('No one in the voice channel');
					leaveVoiceChannel(newState.guild.id);
				}
			}, 5 * MINUTES);
		}
	}
});

client.on('interactionCreate', (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const { commandName } = interaction;

	const command = commands[commandName];
	if (!command) return;

	if (command.permissions?.memberInVoice && !inVoiceChannel(interaction)) {
		return;
	}

	if (!interaction.guildId) return;

	const server = servers.get(interaction.guildId);

	command.interaction({ interaction, server });
});

client.login(TOKEN);
