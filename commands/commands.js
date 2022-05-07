const { MessageEmbed } = require('discord.js');
const fs = require('fs');
const prefix = process.env.prefix || '-';

module.exports = {
  name: 'commands',
  description: 'List all supported commands',
  aliases: [],
  command: (message, arguments, serverQueue, client) => {
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

    const embed = new MessageEmbed()
      .setColor('#ff69b4')
      .setTitle('Music Bot Commands')
      .setDescription(msg);

    message.channel.send({ embeds: [embed] });
  },
};
