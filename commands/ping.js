/** @type {import('../index.js').Command} */
export default {
	name: 'ping',
	description: 'Pong!',
	aliases: [],
	permissions: {
		memberInVoice: false
	},
	command: (message) => {
		return message.channel.send('pong!');
	},

	interaction: async (interaction) => {
		return interaction.reply({
			content: 'pong!',
			ephemeral: true
		});
	}
};
