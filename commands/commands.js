const { commandsEmbed } = require('../utils/embeds');

module.exports = {
  name: 'commands',
  description: 'List all supported commands',
  aliases: [],
  permissions: {
    memberInVoice: false,
  },
  command: (message, arguments, client) => {
    return message.channel.send({ embeds: [commandsEmbed()] });
  },

  interaction: async (interaction, client) => {
    return interaction.reply({
      embeds: [commandsEmbed()],
      ephemeral: true,
    });
  },
};
