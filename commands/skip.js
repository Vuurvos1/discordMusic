module.exports = {
  name: 'skip',
  description: 'Skip the current song',
  aliases: ['s'],
  permissions: {
    memberInVoice: true,
  },
  command: (message, arguments, client) => {
    const guildQueue = client.queue.get(message.guild.id);

    if (!guildQueue) {
      return message.channel.send('There is no song that I could skip!');
    }

    const song = guildQueue.songs[0]; // get current song
    if (guildQueue.audioPlayer) {
      guildQueue.audioPlayer.stop(); // stop song
    }

    message.react('👌');
  },

  interaction: async (interaction, client) => {
    const guildQueue = client.queue.get(interaction.guild.id);

    if (!guildQueue) {
      return interaction.reply({
        content: 'There is no song that I could skip!',
        ephemeral: true,
      });
    }

    const song = guildQueue.songs[0]; // get current song
    if (guildQueue.audioPlayer) {
      guildQueue.audioPlayer.stop(); // stop song
    }

    return interaction.reply({
      content: `Skipped \`${song.title}\``,
      ephemeral: false,
    });
  },
};
