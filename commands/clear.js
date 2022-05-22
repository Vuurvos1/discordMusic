const { MessageEmbed } = require('discord.js');
const { colors, inVoiceChannel } = require('../utils/utils');

module.exports = {
  name: 'clear',
  description: 'Clear the current queue',
  aliases: [],
  permissions: {
    memberInVoice: true,
  },

  command: (message, arguments, client) => {
    const guildQueue = client.queue.get(message.guild.id);

    if (!guildQueue) {
      const embed = new MessageEmbed()
        .setColor(colors.error)
        .setDescription('Nothing to clear');
      return message.channel.send({ embeds: [embed] });
    }

    guildQueue.songs = [];

    const embed = new MessageEmbed()
      .setColor(colors.default)
      .setDescription('Cleared the queue');
    return message.channel.send({ embeds: [embed] });
  },

  interaction: async (interaction, client) => {
    const guildQueue = client.queue.get(interaction.guild.id);

    if (!guildQueue) {
      const embed = new MessageEmbed()
        .setColor(colors.error)
        .setDescription('Nothing to clear');

      return interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    }

    guildQueue.songs = [];

    const embed = new MessageEmbed()
      .setColor(colors.default)
      .setDescription('Cleared the queue');

    return interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });
  },
};
