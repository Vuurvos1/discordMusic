module.exports = {
  name: 'unpause',
  description: 'Unpause playback',
  aliases: [],
  command: (message, arguments, serverQueue, client) => {
    serverQueue.audioPlayer.unpause();
    return message.channel.send('Unpaused music');
  },
};
