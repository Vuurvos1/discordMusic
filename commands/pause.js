module.exports = {
  name: 'pause',
  description: 'Pause playback',
  aliases: [],
  command: (message, arguments, serverQueue, client) => {
    serverQueue.audioPlayer.pause();
    return message.channel.send('Paused music');
  },
};
