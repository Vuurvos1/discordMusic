module.exports = {
  name: 'ping',
  description: 'Pong!',
  aliases: [],
  permissions: {
    memberInVoice: false,
  },
  command: (message, arguments, client) => {
    return message.channel.send('pong!');
  },

  interaction: async (interaction, client) => {
    return interaction.reply('pong!');
  },
};
