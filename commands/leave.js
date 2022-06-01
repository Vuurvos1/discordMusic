const { errorEmbed } = require('../utils/embeds');

module.exports = {
  name: 'leave',
  description: 'Leave voice channel',
  aliases: ['dc', 'disconnect'],
  permissions: {
    memberInVoice: true,
  },
  command: (message, arguments, client) => {
    const guildQueue = client.queue.get(message.guild.id);

    if (!guildQueue) {
      return message.channel.send({
        embeds: [errorEmbed("I'm not in a voice channel")],
      });
    }

    guildQueue.connection.destroy();
    client.queue.delete(message.guild.id);

    message.react('👋');
  },

  interaction: async (interaction, client) => {
    const guildQueue = client.queue.get(interaction.guild.id);

    if (!guildQueue) {
      return interaction.reply({
        embeds: [errorEmbed("I'm not in a voice channel")],
        ephemeral: true,
      });
    }

    guildQueue.connection.destroy();
    client.queue.delete(interaction.guild.id);

    return interaction.reply({
      content: "I've left the voice channel",
      ephemeral: false,
    });
  },
};
