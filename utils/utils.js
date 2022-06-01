const { MessageEmbed } = require('discord.js');

const colors = {
  error: '#FF1155',
  default: '#11FFAA',
  hotpink: '#FF69B4',
};

function inVoiceChannel(message) {
  // check if you are in a voice channel
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
    const embed = new MessageEmbed()
      .setColor(colors.error)
      .setDescription('You have to be in a voice channel to use this command!');
    if (message.commandName) {
      // command interacton
      message.reply({
        embeds: [embed],
        ephemeral: false,
      });
    } else {
      message.channel.send({ embeds: [embed] });
    }

    return false;
  }

  return true;
}

function leaveVoiceChannel(queue, id) {
  // destroy connection and delete queue
  const guildQueue = queue.get(id);

  guildQueue.audioPlayer.stop();
  guildQueue.connection.destroy();
  queue.delete(id);
}

function getVoiceUsers(queue) {
  // get the amount of users in a voice channel
  return queue?.voiceChannel?.members?.size;
}

module.exports = {
  colors,
  MINUTES: 60 * 1000,
  inVoiceChannel,
  leaveVoiceChannel,
  getVoiceUsers,
};
