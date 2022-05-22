const { MessageEmbed } = require('discord.js');
const fs = require('fs');
const { colors } = require('../utils/utils');
const prefix = process.env.prefix || '-';

module.exports = {
  name: 'commands',
  description: 'List all supported commands',
  aliases: [],
  permissions: {
    memberInVoice: false,
  },
  command: (message, arguments, client) => {
    const embed = new MessageEmbed()
      .setColor('#ff69b4')
      .setTitle('Music Bot Commands')
      .setDescription(formatCommands());

    return message.channel.send({ embeds: [embed] });
  },

  interaction: async (interaction, client) => {
    const embed = new MessageEmbed()
      .setColor(colors.default)
      .setTitle('Music Bot Commands')
      .setDescription(formatCommands());

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};

function formatCommands() {
  const commandFiles = fs
    .readdirSync('./commands/')
    .filter((file) => file.endsWith('.js'));

  let msg = '';
  for (const file of commandFiles) {
    const { name, description, aliases } = require(`./${file}`);

    if (description) {
      msg += `${prefix}${name} - ${description} ${
        aliases?.length > 0 ? '`(Alias: ' + aliases.join(', ') + ')`' : ''
      } \n`;
    }
  }

  return msg;
}
