import { EmbedBuilder } from 'discord.js';
import { colors } from './utils.js';

/**
 * @param {import('discord.js').Message | import('discord.js').Interaction} message Discord js message object
 * @param {import('../index').Song} song Song info
 */
export function queuedEmbed(message, song) {
	// change to always send the author?
	return new EmbedBuilder().setDescription(
		`Queued [${song.title.length > 60 ? song.title.substring(0, 60 - 1) + '…' : song.title}](${
			song.url
		})${message?.isCommand() ? '' : ' [<@' + message.author.id + '>]'}`
	);
}

/** @param {string} text  */
export function defaultEmbed(text) {
	return new EmbedBuilder().setColor(colors.default).setDescription(text);
}

/** @param {string} errText  */
export function errorEmbed(errText) {
	return new EmbedBuilder().setColor(colors.error).setDescription(errText);
}
