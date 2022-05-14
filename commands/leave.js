module.exports = {
  name: 'leave',
  description: 'Leave voice channel',
  aliases: ['dc', 'disconnect'],
  command: (message, arguments, client) => {
    const guildQueue = client.queue.get(message.guild.id);

    if (!guildQueue) {
      return message.channel.send("I'm currently not in a voice channel");
    }

    guildQueue.connection.destroy();
    client.queue.delete(message.guild.id);
  },
};
