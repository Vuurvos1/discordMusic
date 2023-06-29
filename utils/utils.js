import { EmbedBuilder, PermissionsBitField } from 'discord.js';

/** @type {Map<string, import('../').GuildQueueItem>} */
export const servers = new Map();

export const colors = {
	error: 0xff1155,
	default: 0x11ffaa,
	hotpink: 0xff69b4
};

/**
 * Check if a user is in a voice channel
 * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} message
 * @returns {boolean}
 * */
export function inVoiceChannel(message) {
	if (!message.member) return false;

	// TODO: change to take a user instead of a message, also don't have message logic in here
	const voiceChannel = message.member?.voice.channel; // this does exist
	if (!voiceChannel) {
		const embed = new EmbedBuilder()
			.setColor(colors.error)
			.setDescription('You have to be in a voice channel to use this command!');

		sendMessage(
			message,
			{
				embeds: [embed]
			},
			false
		);

		return false;
	}

	return true;
}

/**
 * destroy connection and delete queue
 * @param {string} id
 */
export function leaveVoiceChannel(id) {
	const guildQueue = servers.get(id);
	guildQueue?.audioPlayer?.stop();
	guildQueue?.connection?.destroy();
	servers.delete(id);
}

/**
 * get the amount of users in a voice channel
 * @param {import('../').GuildQueueItem} queue
 */
export function getUsersInVoice(queue) {
	return queue?.voiceChannel?.members?.size || 0;
}

// check if bot has premission to join vc
/**
 * @param {import('discord.js').VoiceChannel | import('discord.js').VoiceBasedChannel} voiceChannel
 * @param {import('discord.js').User} user
 * @returns {boolean} is user can join and speak inside a voice channel
 */
export function canJoinVoiceChannel(voiceChannel, user) {
	const permissions = voiceChannel.permissionsFor(user);

	if (
		permissions &&
		permissions.has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])
	) {
		return true;
	}
	return false;
}

/** @param {string} urlString */
export function isValidUrl(urlString) {
	try {
		return Boolean(new URL(urlString));
	} catch (e) {
		return false;
	}
}

/**
 * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} message
 * @param {import('discord.js').MessageCreateOptions } messagePayload
 * @param {boolean} ephemeral
 */
export function sendMessage(message, messagePayload, ephemeral = false) {
	// Switch this so ephemeral is default, and just pass it to channel send where it should be ignored

	if (message?.isCommand) {
		// slash command
		// @ts-ignore funky type conversion
		message.reply({ ...messagePayload, ephemeral });
	} else {
		// text command
		message.channel?.send(messagePayload);
	}
}

export const MINUTES = 60 * 1000;
