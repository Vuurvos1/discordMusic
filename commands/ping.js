module.exports = {
  name: 'ping',
  description: 'Pong!',
  aliases: [],
  command: (message, arguments, client) => {
    return message.channel.send('pong');
  },
};
