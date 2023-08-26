import { errorEmbed } from '../utils/embeds.js';
import { leaveVoiceChannel } from '../utils/utils.js';

/** @type {import('../').Command} */
export default {
	name: 'leave',
	description: 'Leave voice channel',
	aliases: ['dc', 'disconnect'],
	permissions: {
		memberInVoice: true
	},
	command: ({ message, server }) => {
		if (!message.guild) return;

		if (!server) {
			return message.channel.send({
				embeds: [errorEmbed("I'm not in a voice channel")]
			});
		}

		leaveVoiceChannel(message.guild.id);

		message.react('👋');
	},

	interaction: async ({ interaction, server }) => {
		if (!interaction.guild) return;

		if (!server) {
			return interaction.reply({
				embeds: [errorEmbed("I'm not in a voice channel")],
				ephemeral: true
			});
		}

		leaveVoiceChannel(interaction.guild.id);

		return interaction.reply({
			content: "I've left the voice channel",
			ephemeral: false
		});
	}
};
