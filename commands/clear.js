module.exports = {
  name: 'clear',
  description: 'Clear the current queue',
  aliases: [],
  command: (message, arguments, client) => {
    const guildQueue = client.queue.get(message.guild.id);
    guildQueue.songs = [];
    message.channel.send('Cleared the queue');
  },
};
