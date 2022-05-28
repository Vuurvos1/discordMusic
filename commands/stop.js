module.exports = {
  name: 'stop',
  description: 'Stop playback',
  aliases: [],
  permissions: {
    memberInVoice: true,
  },
  command: (message, arguments, client) => {
    const guildQueue = client.queue.get(message.guild.id);

    if (!guildQueue) {
      return message.channel.send('There is no song that I could stop!');
    }

    guildQueue.songs = [];

    if (guildQueue.audioPlayer) {
      guildQueue.audioPlayer.stop();
    }

    return message.channel.send('Stopped music');
  },

  interaction: async (interaction, client) => {
    const guildQueue = client.queue.get(interaction.guild.id);

    if (!guildQueue) {
      return interaction.reply({
        content: 'There is no song that I could stop!',
        ephemeral: false,
      });
    }

    guildQueue.songs = [];

    if (guildQueue.audioPlayer) {
      guildQueue.audioPlayer.stop();
    }

    return interaction.reply({
      content: 'Stopped music',
      ephemeral: false,
    });
  },
};
