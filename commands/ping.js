import { MessageFlags } from 'discord.js';

/** @type {import('../').Command} */
export default {
	name: 'ping',
	description: 'Pong!',
	permissions: {
		memberInVoice: false
	},

	interaction: async ({ interaction }) => {
		return interaction.reply({
			content: 'pong!',
			flags: MessageFlags.Ephemeral
		});
	}
};
