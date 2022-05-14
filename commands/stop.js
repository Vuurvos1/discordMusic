module.exports = {
  name: 'stop',
  description: 'Stop playback',
  aliases: [],
  command: (message, arguments, client) => {
    if (!message.member.voice.channel) {
      return message.channel.send(
        'You have to be in a voice channel to stop the music!'
      );
    }

    const guildQueue = client.queue.get(message.guild.id);
    if (!guildQueue) {
      return message.channel.send('There is no song that I could stop!');
    }

    guildQueue.songs = [];
    guildQueue.audioPlayer.stop();
  },
};
