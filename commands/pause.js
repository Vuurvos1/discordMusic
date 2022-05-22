module.exports = {
  name: 'pause',
  description: 'Pause playback',
  aliases: [],
  command: (message, arguments, client) => {
    // TODO check for vc
    const guildQueue = client.queue.get(message.guild.id);
    guildQueue.audioPlayer.pause();
    return message.channel.send('Paused music');
  },

  interaction: async (interaction, client) => {
    // TODO check for vc
    const guildQueue = client.queue.get(interaction.guild.id);
    guildQueue.audioPlayer.pause();
    return interaction.channel.send('Paused music');
  },
};
