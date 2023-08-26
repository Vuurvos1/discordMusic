import { errorEmbed } from '../utils/embeds.js';

/** @type {import('../').Command} */
export default {
	name: 'shuffle',
	description: 'Shuffle the song queueu',
	aliases: ['sh'],
	permissions: {
		memberInVoice: true
	},
	command: ({ message, server }) => {
		if (!message.guild) return;

		if (!server) {
			return message.channel.send({
				embeds: [errorEmbed('Nothing to shuffle!')]
			});
		}

		server.songs.sort(() => Math.random() - 0.5);

		message.react('🔀');
	},

	interaction: async ({ interaction, server }) => {
		if (!interaction.guild) return;

		if (!server) {
			return interaction.reply({ embeds: [errorEmbed('Nothing to shuffle')] });
		}

		server.songs.sort(() => Math.random() - 0.5);

		return interaction.reply({
			content: 'Shuffled queue',
			ephemeral: false
		});
	}
};
