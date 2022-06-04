export default {
  name: 'ping',
  description: 'Pong!',
  aliases: [],
  permissions: {
    memberInVoice: false,
  },
  command: (message, args, client) => {
    return message.channel.send('pong!');
  },

  interaction: async (interaction, client) => {
    return interaction.reply({
      content: 'pong!',
      ephemeral: true,
    });
  },
};
