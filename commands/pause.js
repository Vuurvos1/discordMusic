import { errorEmbed, defaultEmbed } from '../utils/embeds.js';

/** @type {import('../index.js').Command} */
export default {
	name: 'pause',
	description: 'Pause playback',
	aliases: [],
	permissions: {
		memberInVoice: true
	},
	command: ({ message, server }) => {
		if (!message.guild) return;

		if (!server) {
			return message.channel.send({ embeds: [errorEmbed('Nothing to pause')] });
		}

		if (!server.audioPlayer) return;

		server.audioPlayer.pause();
		server.paused = true;
		message.react('⏸');
	},

	interaction: async ({ interaction, server }) => {
		if (!interaction.guild) return;

		if (!server || server.paused) {
			return interaction.reply({
				embeds: [errorEmbed('Nothing to pause')],
				ephemeral: true
			});
		}

		if (!server.audioPlayer) return;

		server.audioPlayer.pause();
		server.paused = true;
		return interaction.reply({
			embeds: [defaultEmbed('Paused music')],
			ephemeral: false
		});
	}
};
