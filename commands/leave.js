module.exports = {
  name: 'leave',
  description: 'Leave voice channel',
  aliases: ['dc', 'disconnect'],
  permissions: {
    memberInVoice: true,
  },
  command: (message, arguments, client) => {
    const guildQueue = client.queue.get(message.guild.id);

    if (!guildQueue) {
      return message.channel.send("I'm currently not in a voice channel");
    }

    guildQueue.connection.destroy();
    client.queue.delete(message.guild.id);
    return message.channel.send("I've left the voice channel");
  },

  interaction: async (interaction, client) => {
    const guildQueue = client.queue.get(interaction.guild.id);

    if (!guildQueue) {
      interaction.reply({
        content: "I'm currently not in a voice channel",
        ephemeral: true,
      });
    }

    guildQueue.connection.destroy();
    client.queue.delete(interaction.guild.id);

    interaction.reply({
      content: "I've left the voice channel",
    });
  },
};
