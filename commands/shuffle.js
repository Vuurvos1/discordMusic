module.exports = {
  name: 'shuffle',
  description: 'Shuffle the song queueu',
  aliases: ['sh'],
  command: (message, arguments, client) => {
    const guildQueue = client.queue.get(message.guild.id);
    guildQueue.songs.sort(() => Math.random() - 0.5);
    return message.channel.send('Shuffled queue');
  },

  interaction: async (interaction, client) => {
    // TODO check if you are in vc
    const guildQueue = client.queue.get(interaction.guild.id);
    guildQueue.songs.sort(() => Math.random() - 0.5);
    return interaction.channel.send('Shuffled queue');
  },
};
