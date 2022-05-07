module.exports = {
  name: 'shuffle',
  description: 'Shuffle the song queueu',
  aliases: ['sh'],
  command: (message, arguments, serverQueue, client) => {
    serverQueue.songs.sort(() => Math.random() - 0.5);
    return message.channel.send('Shuffled queue');
  },
};
