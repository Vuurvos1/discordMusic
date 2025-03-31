import { MessageFlags } from 'discord.js';
import { errorEmbed } from '../utils/embeds.js';
import { leaveVoiceChannel } from '../utils/utils.js';

/** @type {import('../').Command} */
export default {
	name: 'leave',
	description: 'Leave voice channel',
	permissions: {
		memberInVoice: true
	},

	interaction: async ({ interaction, server }) => {
		if (!interaction.guild) return;

		if (!server) {
			return interaction.reply({
				embeds: [errorEmbed("I'm not in a voice channel")],
				flags: MessageFlags.Ephemeral
			});
		}

		leaveVoiceChannel(interaction.guild.id);

		return interaction.reply({
			content: "I've left the voice channel"
		});
	}
};
