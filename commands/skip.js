const { errorEmbed, defaultEmbed } = require('../utils/embeds');

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
      return message.channel.send({
        embeds: [errorEmbed('Nothing to skip!')],
      });
    }

    if (guildQueue.audioPlayer) {
      guildQueue.audioPlayer.stop(); // stop song
    }

    message.react('👌');
  },

  interaction: async (interaction, client) => {
    const guildQueue = client.queue.get(interaction.guild.id);

    if (!guildQueue) {
      return interaction.reply({
        embeds: [errorEmbed('Nothing to skip!')],
        ephemeral: true,
      });
    }

    const songTitle = guildQueue.songs[0].title; // get current song title
    if (guildQueue.audioPlayer) {
      guildQueue.audioPlayer.stop(); // stop song
    }

    return interaction.reply({
      embeds: defaultEmbed(`Skipped \`${songTitle}\``),
      ephemeral: false,
    });
  },
};
