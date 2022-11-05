import { errorEmbed } from '../utils/embeds.js';

export default {
	name: 'shuffle',
	description: 'Shuffle the song queueu',
	aliases: ['sh'],
	permissions: {
		memberInVoice: true
	},
	command: (message, args, client) => {
		const guildQueue = client.queue.get(message.guild.id);

		if (!guildQueue) {
			return message.channel.send({
				embeds: [errorEmbed('Nothing to shuffle!')]
			});
		}

		guildQueue.songs.sort(() => Math.random() - 0.5);

		message.react('🔀');
	},

	/**
	 * @param {import('discord.js').Interaction} interaction Discord js message object
	 * @param {import('discord.js').Client} client Song info
	 */
	interaction: async (interaction, client) => {
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
