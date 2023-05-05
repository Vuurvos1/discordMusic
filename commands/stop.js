import { errorEmbed, defaultEmbed } from '../utils/embeds.js';

/** @type {import('../index.js').Command} */
export default {
	name: 'stop',
	description: 'Stop playback',
	aliases: [],
	permissions: {
		memberInVoice: true
	},
	command: ({ message, server }) => {
		if (!message.guild) return;

		if (!server) {
			return message.channel.send({
				embeds: [errorEmbed('Nothing to stop!')]
			});
		}

		server.songs = [];

		if (server.audioPlayer) {
			server.audioPlayer.stop();
		}

		return message.react('🛑');
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
