import { errorEmbed, defaultEmbed } from '../utils/embeds.js';

/** @type {import('../').Command} */
export default {
	name: 'unpause',
	description: 'Unpause playback',
	permissions: {
		memberInVoice: true
	},

	interaction: async ({ interaction, server }) => {
		if (!interaction.guild) return;

		if (!server) {
			return interaction.reply({
				embeds: [errorEmbed('Nothing to unpause')],
				ephemeral: true
			});
		}

		if (!server.audioPlayer) return;

		server.audioPlayer.unpause();
		server.paused = false;
		return interaction.reply({
			embeds: [defaultEmbed('Unpaused music')],
			ephemeral: false
		});
	}
};
