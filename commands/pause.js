import { errorEmbed, defaultEmbed } from '../utils/embeds.js';

/** @type {import('../index.js').Command} */
export default {
	name: 'pause',
	description: 'Pause playback',
	aliases: [],
	permissions: {
		memberInVoice: true
	},
	command: (message, args, client) => {
		if (!message.guild) return;

		const guildQueue = client.queue.get(message.guild.id);

		if (!guildQueue) {
			return message.channel.send({ embeds: [errorEmbed('Nothing to pause')] });
		}

		if (!guildQueue.audioPlayer) return;

		guildQueue.audioPlayer.pause();
		guildQueue.paused = true;
		message.react('⏸');
	},

	interaction: async (interaction, client) => {
		if (!interaction.guild) return;

		const guildQueue = client.queue.get(interaction.guild.id);

		if (!guildQueue || guildQueue.paused) {
			console.log('Nothing to pause');

			return interaction.reply({
				embeds: [errorEmbed('Nothing to pause')],
				ephemeral: true
			});
		}

		if (!guildQueue.audioPlayer) return;

		guildQueue.audioPlayer.pause();
		guildQueue.paused = true;
		return interaction.reply({
			embeds: [defaultEmbed('Paused music')],
			ephemeral: false
		});
	}
};
