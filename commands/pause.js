module.exports = {
  name: 'pause',
  description: 'Pause playback',
  aliases: [],
  command: (message, arguments, client) => {
    const guildQueue = client.queue.get(message.guild.id);
    guildQueue.audioPlayer.pause();
    return message.channel.send('Paused music');
  },
};
