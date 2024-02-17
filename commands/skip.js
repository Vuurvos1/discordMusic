import { errorEmbed, defaultEmbed } from '../utils/embeds.js';

/** @type {import('../').Command} */
export default {
	name: 'skip',
	description: 'Skip the current song',
	permissions: {
		memberInVoice: true
	},

	interaction: async ({ interaction, server }) => {
		if (!interaction.guild) return;

		if (!server) {
			return interaction.reply({
				embeds: [errorEmbed('Nothing to skip!')],
				ephemeral: true
			});
		}

		if (server.audioPlayer) {
			server.audioPlayer.stop(); // stop song to trigger next song
		}

		const songTitle = server.songs[0].title; // get current song title
		return interaction.reply({
			embeds: [defaultEmbed(`Skipped \`${songTitle}\``)],
			ephemeral: false
		});
	}
};
