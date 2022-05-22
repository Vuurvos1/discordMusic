module.exports = {
  name: 'unpause',
  description: 'Unpause playback',
  aliases: [],
  command: (message, arguments, client) => {
    // TODO check for vc
    const guildQueue = client.queue.get(message.guild.id);
    guildQueue.audioPlayer.unpause();
    return message.channel.send('Unpaused music');
  },

  interaction: async (interaction, client) => {
    // TODO check for vc

    const guildQueue = client.queue.get(interaction.guild.id);
    guildQueue.audioPlayer.unpause();
    return interaction.channel.send('Unpaused music');
  },
};
