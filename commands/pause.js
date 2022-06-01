const { errorEmbed, defaultEmbed } = require('../utils/embeds');

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
      return message.channel.send({ embeds: [errorEmbed('Nothing to pause')] });
    }

    guildQueue.audioPlayer.pause();
    message.react('⏸');
  },

  interaction: async (interaction, client) => {
    const guildQueue = client.queue.get(interaction.guild.id);

    if (!guildQueue) {
      return interaction.reply({
        embeds: [errorEmbed('Nothing to pause')],
        ephemeral: true,
      });
    }

    guildQueue.audioPlayer.pause();
    return interaction.reply({
      embeds: defaultEmbed('Paused music'),
      ephemeral: false,
    });
  },
};
