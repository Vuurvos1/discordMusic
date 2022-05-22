const { MessageEmbed } = require('discord.js');
const { colors } = require('../utils/utils');

module.exports = {
  name: 'clear',
  description: 'Clear the current queue',
  aliases: [],
  command: (message, arguments, client) => {
    // check if you are in a voice channel
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      const embed = new MessageEmbed()
        .setColor(colors.error)
        .setDescription(
          'You have to be in a voice channel to use this command!'
        );
      return message.channel.send({ embeds: [embed] });
    }

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
    // check if you are in a voice channel
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      const embed = new MessageEmbed()
        .setColor(colors.error)
        .setDescription(
          'You have to be in a voice channel to use this command!'
        );
      return interaction.channel.send({ embeds: [embed] });
    }

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
