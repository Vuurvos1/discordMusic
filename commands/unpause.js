module.exports = {
  name: 'unpause',
  description: 'Unpause playback',
  aliases: [],
  permissions: {
    memberInVoice: true,
  },
  command: (message, arguments, client) => {
    const guildQueue = client.queue.get(message.guild.id);

    if (!guildQueue) {
      return message.channel.send('Nothing to unpause');
    }

    guildQueue.audioPlayer.unpause();
    return message.channel.send('Unpaused music');
  },

  interaction: async (interaction, client) => {
    const guildQueue = client.queue.get(interaction.guild.id);

    if (!guildQueue) {
      return interaction.reply({
        content: 'Nothing to unpause',
        ephemeral: true,
      });
    }

    guildQueue.audioPlayer.unpause();
    return interaction.reply({
      content: 'Unpaused music',
      ephemeral: false,
    });
  },
};
