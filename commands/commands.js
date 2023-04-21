import { commandsEmbed } from '../utils/embeds.js';

export default {
	name: 'commands',
	description: 'List all supported commands',
	aliases: [],
	permissions: {
		memberInVoice: false
	},
	command: async (message, args, client) => {
		return message.channel.send({
			embeds: [await commandsEmbed(client.commands)]
		});
	},

	interaction: async (interaction, client) => {
		return interaction.reply({
			embeds: [await commandsEmbed(client.commands)],
			ephemeral: true
		});
	}
};
