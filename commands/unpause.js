const { errorEmbed, defaultEmbed } = require('../utils/embeds');

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
      return message.channel.send({
        embeds: [errorEmbed('Nothing to unpause')],
      });
    }

    guildQueue.audioPlayer.unpause();
    message.react('👌');
  },

  interaction: async (interaction, client) => {
    const guildQueue = client.queue.get(interaction.guild.id);

    if (!guildQueue) {
      return interaction.reply({
        embeds: [errorEmbed('Nothing to unpause')],
        ephemeral: true,
      });
    }

    guildQueue.audioPlayer.unpause();
    return interaction.reply({
      embeds: [defaultEmbed('Unpaused music')],
      ephemeral: false,
    });
  },
};
