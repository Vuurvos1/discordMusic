module.exports = {
  name: 'shuffle',
  description: 'Shuffle the song queueu',
  aliases: ['sh'],
  command: (message, arguments, client) => {
    const guildQueue = client.queue.get(message.guild.id);
    guildQueue.songs.sort(() => Math.random() - 0.5);
    return message.channel.send('Shuffled queue');
  },
};
