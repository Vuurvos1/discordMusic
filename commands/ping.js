module.exports = {
  name: 'ping',
  description: 'Ping the bot',
  aliases: [],
  command: (message, arguments, serverQueue, client) => {
    return message.channel.send('pong');
  },
};
