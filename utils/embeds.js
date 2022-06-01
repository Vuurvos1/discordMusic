const fs = require('fs');

const { MessageEmbed } = require('discord.js');
const { colors } = require('./utils');

const prefix = process.env.prefix || '-';

/**
 * @param message Discord js message object
 * @param song Song info
 * @param song.title The song title
 * @param song.url The url of the song
 */
function queuedEmbed(message, song) {
  if (message.commandName) {
    // slash command
    return new MessageEmbed().setDescription(
      `Queued [${
        song.title.length > 60
          ? song.title.substring(0, 60 - 1) + '…'
          : song.title
      }](${song.url})`
    );
  } else {
    // text command
    return new MessageEmbed().setDescription(
      `Queued [${
        song.title.length > 60
          ? song.title.substring(0, 60 - 1) + '…'
          : song.title
      }](${song.url}) [<@${message.author.id}>]`
    );
  }
}

function defaultEmbed(text) {
  return new MessageEmbed().setColor(colors.default).setDescription(text);
}

function errorEmbed(errText) {
  return new MessageEmbed().setColor(colors.error).setDescription(errText);
}

function commandsEmbed(commands) {
  const commandFiles = fs
    .readdirSync('./commands/')
    .filter((file) => file.endsWith('.js'));

  let msg = '';
  for (const file of commandFiles) {
    const { name, description, aliases } = require(`../commands/${file}`);

    if (description) {
      msg += `${prefix}${name} - ${description} ${
        aliases?.length > 0 ? '`(Alias: ' + aliases.join(', ') + ')`' : ''
      } \n`;
    }
  }

  return new MessageEmbed()
    .setColor(colors.default)
    .setTitle('Music Bot Commands')
    .setDescription(msg);
}

module.exports = {
  queuedEmbed,
  errorEmbed,
  defaultEmbed,
  commandsEmbed,
};
