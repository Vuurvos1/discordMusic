import { EmbedBuilder } from 'discord.js';
import { colors } from '../utils/utils.js';
import { prefix } from '../index.js';
import * as commands from './index.js';

/** @type {import('../index.js').Command} */
export default {
	name: 'commands',
	description: 'List all supported commands',
	aliases: [],
	permissions: {
		memberInVoice: false
	},
	command: async (message, args, client) => {
		return message.channel.send({
			embeds: [commandsEmbed()]
		});
	},

	interaction: async (interaction, client) => {
		return interaction.reply({
			embeds: [commandsEmbed()],
			ephemeral: true
		});
	}
};

function commandsEmbed() {
	let msg = '';
	for (const [key, command] of Object.entries(commands)) {
		const { name, description, aliases } = command;

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
