import { errorEmbed, defaultEmbed } from '../utils/embeds.js';

/** @type {import('../index.js').Command} */
export default {
	name: 'unpause',
	description: 'Unpause playback',
	aliases: ['resume'],
	permissions: {
		memberInVoice: true
	},
	command: ({ message, server }) => {
		if (!message.guild) return;

		if (!server) {
			return message.channel.send({
				embeds: [errorEmbed('Nothing to unpause')]
			});
		}

		if (!server.audioPlayer) return;

		server.audioPlayer.unpause();
		server.paused = false;
		message.react('👌');
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
