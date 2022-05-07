module.exports = {
  name: 'ping',
  description: 'Pong!',
  aliases: [],
  command: (message, arguments, serverQueue, client) => {
    return message.channel.send('pong');
  },
};
