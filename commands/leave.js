module.exports = {
  name: 'leave',
  description: 'Leave voice channel',
  aliases: ['dc', 'disconnect'],
  command: (message, arguments, serverQueue, client) => {
    if (!serverQueue) {
      return message.channel.send("I'm currently not in a voice channel");
    }

    serverQueue.connection.destroy();
    queue.delete(message.guild.id);
  },
};
