import { errorEmbed, defaultEmbed } from '../utils/embeds.js';

/** @type {import('../index.js').Command} */
export default {
	name: 'unpause',
	description: 'Unpause playback',
	aliases: [],
	permissions: {
		memberInVoice: true
	},
	command: (message, args, client) => {
		if (!message.guild) return;

		const guildQueue = client.queue.get(message.guild.id);

		if (!guildQueue) {
			return message.channel.send({
				embeds: [errorEmbed('Nothing to unpause')]
			});
		}

		if (!guildQueue.audioPlayer) return;

		guildQueue.audioPlayer.unpause();
		guildQueue.paused = false;
		message.react('👌');
	},

	interaction: async (interaction, client) => {
		if (!interaction.guild) return;

		const guildQueue = client.queue.get(interaction.guild.id);

		if (!guildQueue) {
			return interaction.reply({
				embeds: [errorEmbed('Nothing to unpause')],
				ephemeral: true
			});
		}

		if (!guildQueue.audioPlayer) return;

		guildQueue.audioPlayer.unpause();
		guildQueue.paused = false;
		return interaction.reply({
			embeds: [defaultEmbed('Unpaused music')],
			ephemeral: false
		});
	}
};
