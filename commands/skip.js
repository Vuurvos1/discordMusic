module.exports = {
  name: 'skip',
  description: 'Skip the current song',
  aliases: ['s'],
  command: (message, arguments, client) => {
    if (!message.member.voice.channel) {
      return message.channel.send(
        'You have to be in a voice channel to skip the music!'
      );
    }

    const guildQueue = client.queue.get(message.guild.id);
    if (!guildQueue) {
      return message.channel.send('There is no song that I could skip!');
    }

    const song = guildQueue.songs[0]; // get current song
    guildQueue.audioPlayer.stop(); // stop song
    return message.channel.send(`Skipped \`${song.title}\``);
  },
};
