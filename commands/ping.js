module.exports = {
  name: 'ping',
  description: 'Pong!',
  aliases: [],
  command: (message, arguments, client) => {
    return message.channel.send('pong');
  },

  interaction: async (interaction, client) => {
    return interaction.channel.send('pong');
  },
};
