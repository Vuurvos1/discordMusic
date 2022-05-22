module.exports = {
  name: 'shuffle',
  description: 'Shuffle the song queueu',
  aliases: ['sh'],
  permissions: {
    memberInVoice: true,
  },
  command: (message, arguments, client) => {
    const guildQueue = client.queue.get(message.guild.id);

    if (!guildQueue) {
      return message.channel.send('Nothing to shuffle');
    }

    guildQueue.songs.sort(() => Math.random() - 0.5);
    return message.channel.send('Shuffled queue');
  },

  interaction: async (interaction, client) => {
    const guildQueue = client.queue.get(interaction.guild.id);

    if (!guildQueue) {
      return interaction.reply('Nothing to shuffle');
    }

    guildQueue.songs.sort(() => Math.random() - 0.5);
    return interaction.channel.send('Shuffled queue');
  },
};
