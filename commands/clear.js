module.exports = {
  name: 'clear',
  description: 'Clear the current queue',
  aliases: [],
  command: (message, arguments, serverQueue, client) => {
    serverQueue.songs = [];
    message.channel.send('Cleared the queue');
  },
};
