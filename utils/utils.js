const { MessageEmbed } = require('discord.js');

const colors = {
  error: '#ff0000',
  default: '11FFAA',
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

function ifQueue() {
  return true;
}

module.exports = {
  colors,
  inVoiceChannel,
  ifQueue,
};
