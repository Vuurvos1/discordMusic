import { errorEmbed, defaultEmbed } from '../utils/embeds.js';

/** @type {import('../').Command} */
export default {
	name: 'stop',
	description: 'Stop playback',
	permissions: {
		memberInVoice: true
	},

	interaction: async ({ interaction, server }) => {
		if (!interaction.guild) return;

		if (!server) {
			return interaction.reply({
				embeds: [errorEmbed('Nothing to stop!')],
				ephemeral: false
			});
		}

		server.songs = [];

		if (server.audioPlayer) {
			server.audioPlayer.stop();
		}

		return interaction.reply({
			embeds: [defaultEmbed('Stopped music')],
			ephemeral: false
		});
	}
};
