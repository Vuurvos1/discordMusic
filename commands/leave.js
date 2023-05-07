import { errorEmbed } from '../utils/embeds.js';

/** @type {import('../index.js').Command} */
export default {
	name: 'leave',
	description: 'Leave voice channel',
	aliases: ['dc', 'disconnect'],
	permissions: {
		memberInVoice: true
	},
	command: ({ message, server, servers }) => {
		if (!message.guild) return;

		if (!server) {
			return message.channel.send({
				embeds: [errorEmbed("I'm not in a voice channel")]
			});
		}

		// TODO: create a function to handle this
		if (server.connection) server.connection.destroy();
		if (message.guild) servers.delete(message.guild.id);

		message.react('👋');
	},

	interaction: async ({ interaction, server, servers }) => {
		if (!interaction.guild) return;

		if (!server) {
			return interaction.reply({
				embeds: [errorEmbed("I'm not in a voice channel")],
				ephemeral: true
			});
		}

		if (server.connection) server.connection.destroy();
		servers.delete(interaction.guild.id);

		return interaction.reply({
			content: "I've left the voice channel",
			ephemeral: false
		});
	}
};
