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
 * @param {string} id
 * */
export function deleteServer(id) {
	servers.delete(id);
}

/**
 * Check if a user is in a voice channel
 * @param {import('discord.js').Message | import('discord.js').Interaction} message
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
		if (message?.isCommand()) {
			// command interacton
			message.reply({
				embeds: [embed],
				ephemeral: false
			});
		} else {
			message.channel?.send({ embeds: [embed] });
		}

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
export function getVoiceUsers(queue) {
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

export const MINUTES = 60 * 1000;
