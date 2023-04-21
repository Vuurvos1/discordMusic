import { errorEmbed, defaultEmbed } from '../utils/embeds.js';

/** @type {import('../index.js').Command} */
export default {
	name: 'clear',
	description: 'Clear the current queue',
	aliases: [],
	permissions: {
		memberInVoice: true
	},

	command: (message, args, client) => {
		if (!message.guild) return;

		const guildQueue = client.queue.get(message.guild.id);

		if (!guildQueue) {
			return message.channel.send({ embeds: [errorEmbed('Nothing to clear')] });
		}

		// remove all items from queue except first (this song might be playing)
		guildQueue.songs = [guildQueue.songs[0]];

		message.react('👌');
	},

	interaction: async (interaction, client) => {
		if (!interaction.guild) return;

		const guildQueue = client.queue.get(interaction.guild.id);

		if (!guildQueue) {
			return interaction.reply({
				embeds: [errorEmbed('Nothing to clear')],
				ephemeral: true
			});
		}

		// remove all items from queue except first (this song might be playing)
		guildQueue.songs = [guildQueue.songs[0]];

		return interaction.reply({
			embeds: [defaultEmbed('Cleared the queue')],
			ephemeral: false
		});
	}
};
