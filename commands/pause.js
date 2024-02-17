import { errorEmbed, defaultEmbed } from '../utils/embeds.js';

/** @type {import('../').Command} */
export default {
	name: 'pause',
	description: 'Pause playback',
	permissions: {
		memberInVoice: true
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
