import { EmbedBuilder } from 'discord.js';
import { colors } from '../utils/utils.js';

/** @type {import('../index.js').Command} */
export default {
	name: 'help',
	description: 'List of all supported commands',
	permissions: {
		memberInVoice: false
	},

	interaction: async ({ interaction }) => {
		let msg = '';

		const commands = await interaction.guild?.commands.fetch();

		if (!commands) {
			return interaction.reply({
				content: 'No commands found',
				ephemeral: true
			});
		}

		// TODO: sort commands by name length

		for (const [key, value] of commands) {
			const { id, name, description } = value;

			if (description) {
				msg += `</${name}:${id}> - ${description}\n`;
			}
		}

		const embed = new EmbedBuilder()
			.setColor(colors.default)
			.setTitle('Music Bot Commands')
			.setDescription(msg);

		return interaction.reply({
			embeds: [embed],
			ephemeral: true
		});
	}
};
