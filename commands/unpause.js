module.exports = {
  name: 'unpause',
  description: 'Unpause playback',
  aliases: [],
  command: (message, arguments, client) => {
    const guildQueue = client.queue.get(message.guild.id);
    guildQueue.audioPlayer.unpause();
    return message.channel.send('Unpaused music');
  },
};
