module.exports = {
  name: 'skip',
  description: 'Skip the current song',
  aliases: ['s'],
  command: (message, arguments, serverQueue, client) => {
    if (!message.member.voice.channel) {
      return message.channel.send(
        'You have to be in a voice channel to skip the music!'
      );
    }

    if (!serverQueue) {
      return message.channel.send('There is no song that I could skip!');
    }

    const song = serverQueue.songs[0]; // get current song
    serverQueue.audioPlayer.stop(); // stop song
    return message.channel.send(`Skipped \`${song.title}\``);
  },
};
