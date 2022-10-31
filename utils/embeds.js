import { EmbedBuilder } from 'discord.js';
import { colors } from './utils.js';

const prefix = process.env.prefix || '-';

/**
 * @param {import('discord.js').Message} message Discord js message object
 * @param {import('../index').Song} song Song info
 */
export function queuedEmbed(message, song) {
	return new EmbedBuilder().setDescription(
		`Queued [${song.title.length > 60 ? song.title.substring(0, 60 - 1) + '…' : song.title}](${
			song.url
		})${message.commandName ? '' : ' [<@' + message.author.id + '>]'}`
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

export async function commandsEmbed(commands) {
	let msg = '';
	for (const command of commands) {
		const { name, description, aliases } = command[1];

		if (description) {
			msg += `${prefix}${name} - ${description} ${
				aliases?.length > 0 ? '`(Alias: ' + aliases.join(', ') + ')`' : ''
			} \n`;
		}
	}

	return new EmbedBuilder()
		.setColor(colors.default)
		.setTitle('Music Bot Commands')
		.setDescription(msg);
}
