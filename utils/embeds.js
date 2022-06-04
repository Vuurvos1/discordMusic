import { MessageEmbed } from 'discord.js';
import { colors } from './utils.js';

const prefix = process.env.prefix || '-';

/**
 * @param message Discord js message object
 * @param song Song info
 * @param song.title The song title
 * @param song.url The url of the song
 */
export function queuedEmbed(message, song) {
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

export function defaultEmbed(text) {
  return new MessageEmbed().setColor(colors.default).setDescription(text);
}

export function errorEmbed(errText) {
  return new MessageEmbed().setColor(colors.error).setDescription(errText);
}

export async function commandsEmbed(commands) {
  let msg = '';
  for (const command of commands) {
    const { name, description, aliases } = command[1];

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
