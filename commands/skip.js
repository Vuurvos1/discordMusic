import { errorEmbed, defaultEmbed } from '../utils/embeds.js';

export default {
	name: 'skip',
	description: 'Skip the current song',
	aliases: ['s'],
	permissions: {
		memberInVoice: true
	},
	command: (message, args, client) => {
		const guildQueue = client.queue.get(message.guild.id);

		if (!guildQueue) {
			return message.channel.send({
				embeds: [errorEmbed('Nothing to skip!')]
			});
		}

		if (guildQueue.audioPlayer) {
			guildQueue.audioPlayer.stop(); // stop song to trigger next song
		}

		message.react('👌');
	},

	interaction: async (interaction, client) => {
		const guildQueue = client.queue.get(interaction.guild.id);

		if (!guildQueue) {
			return interaction.reply({
				embeds: [errorEmbed('Nothing to skip!')],
				ephemeral: true
			});
		}

		if (guildQueue.audioPlayer) {
			guildQueue.audioPlayer.stop(); // stop song to trigger next song
		}

		const songTitle = guildQueue.songs[0].title; // get current song title
		return interaction.reply({
			embeds: [defaultEmbed(`Skipped \`${songTitle}\``)],
			ephemeral: false
		});
	}
};
