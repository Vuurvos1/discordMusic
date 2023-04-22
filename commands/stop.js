import { errorEmbed, defaultEmbed } from '../utils/embeds.js';

/** @type {import('../index.js').Command} */
export default {
	name: 'stop',
	description: 'Stop playback',
	aliases: [],
	permissions: {
		memberInVoice: true
	},
	command: (message, args, client) => {
		if (!message.guild) return;

		const guildQueue = client.queue.get(message.guild.id);

		if (!guildQueue) {
			return message.channel.send({
				embeds: [errorEmbed('Nothing to stop!')]
			});
		}

		guildQueue.songs = [];

		if (guildQueue.audioPlayer) {
			guildQueue.audioPlayer.stop();
		}

		return message.react('🛑');
	},

	interaction: async (interaction, client) => {
		if (!interaction.guild) return;

		const guildQueue = client.queue.get(interaction.guild.id);

		if (!guildQueue) {
			return interaction.reply({
				embeds: [errorEmbed('Nothing to stop!')],
				ephemeral: false
			});
		}

		guildQueue.songs = [];

		if (guildQueue.audioPlayer) {
			guildQueue.audioPlayer.stop();
		}

		return interaction.reply({
			embeds: [defaultEmbed('Stopped music')],
			ephemeral: false
		});
	}
};
