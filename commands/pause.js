module.exports = {
  name: 'pause',
  description: 'Pause playback',
  aliases: [],
  permissions: {
    memberInVoice: true,
  },
  command: (message, arguments, client) => {
    const guildQueue = client.queue.get(message.guild.id);

    if (!guildQueue) {
      return message.channel.send('Nothing to pause');
    }

    guildQueue.audioPlayer.pause();
    return message.channel.send('Paused music');
  },

  interaction: async (interaction, client) => {
    const guildQueue = client.queue.get(interaction.guild.id);

    if (!guildQueue) {
      return interaction.reply('Nothing to pause');
    }

    guildQueue.audioPlayer.pause();
    return interaction.reply('Paused music');
  },
};
