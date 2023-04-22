import { errorEmbed } from '../utils/embeds.js';

/** @type {import('../index.js').Command} */
export default {
	name: 'shuffle',
	description: 'Shuffle the song queueu',
	aliases: ['sh'],
	permissions: {
		memberInVoice: true
	},
	command: (message, args, client) => {
		if (!message.guild) return;

		const guildQueue = client.queue.get(message.guild.id);

		if (!guildQueue) {
			return message.channel.send({
				embeds: [errorEmbed('Nothing to shuffle!')]
			});
		}

		guildQueue.songs.sort(() => Math.random() - 0.5);

		message.react('🔀');
	},

	interaction: async (interaction, client) => {
		if (!interaction.guild) return;

		const guildQueue = client.queue.get(interaction.guild.id);

		if (!guildQueue) {
			return interaction.reply({ embeds: [errorEmbed('Nothing to shuffle')] });
		}

		guildQueue.songs.sort(() => Math.random() - 0.5);

		return interaction.reply({
			content: 'Shuffled queue',
			ephemeral: false
		});
	}
};
