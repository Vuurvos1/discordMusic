import { errorEmbed, defaultEmbed } from '../utils/embeds.js';

/** @type {import('../').Command} */
export default {
	name: 'clear',
	description: 'Clear the current queue',
	permissions: {
		memberInVoice: true
	},

	interaction: async ({ interaction, server }) => {
		if (!interaction.guild) return;

		if (!server) {
			return interaction.reply({
				embeds: [errorEmbed('Nothing to clear')],
				ephemeral: true
			});
		}

		// remove all items from queue except first (this song might be playing)
		server.songs = [server.songs[0]];

		return interaction.reply({
			embeds: [defaultEmbed('Cleared the queue')],
			ephemeral: false
		});
	}
};
