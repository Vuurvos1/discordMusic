import { errorEmbed, defaultEmbed } from '../utils/embeds.js';

export default {
  name: 'clear',
  description: 'Clear the current queue',
  aliases: [],
  permissions: {
    memberInVoice: true,
  },

  command: (message, args, client) => {
    const guildQueue = client.queue.get(message.guild.id);

    if (!guildQueue) {
      return message.channel.send({ embeds: [errorEmbed('Nothing to clear')] });
    }

    guildQueue.songs = [];

    return message.channel.send({
      embeds: [defaultEmbed('Cleared the queue')],
    });
  },

  interaction: async (interaction, client) => {
    const guildQueue = client.queue.get(interaction.guild.id);

    if (!guildQueue) {
      return interaction.reply({
        embeds: [errorEmbed('Nothing to clear')],
        ephemeral: true,
      });
    }

    guildQueue.songs = [];

    return interaction.reply({
      embeds: [defaultEmbed('Cleared the queue')],
      ephemeral: false,
    });
  },
};
