require('dotenv').config();

const DiscordJS = require('discord.js');
const { Intents } = require('discord.js');
const voice = require('@discordjs/voice');
const {
  joinVoiceChannel,
  createAudioResource,
  createAudioPlayer,
  AudioPlayerStatus,
} = require('@discordjs/voice');

const prefix = '-';

const { botToken } = process.env;

const ytdl = require('ytdl-core');
const yts = require('yt-search');

const client = new DiscordJS.Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

client.on('ready', () => {
  console.log('Ready!');
});
client.login(botToken);

const queue = new Map();

client.on('reconnecting', () => {
  console.log('Reconnecting!');
});

client.on('disconnect', () => {
  console.log('Disconnect!');
});

client.on('messageCreate', async (message) => {
  const tokens = message.content.split(' ');
  let command = tokens.shift();

  if (!message.author.bot && command[0] == prefix) {
    const serverQueue = queue.get(message.guild.id);

    // remove prefix from command
    command = command.substring(1);

    if (command === 'play' || command === 'p') {
      execute(message, tokens, serverQueue);
    } else if (command === 'skip' || command === 's') {
      skip(message, serverQueue);
    } else if (command === 'stop') {
      stop(message, serverQueue);
    } else if (command === 'pause') {
      pause(message, serverQueue);
    } else if (command === 'unpause') {
      unpause(message, serverQueue);
    } else if (command === 'ping') {
      message.channel.send({
        content: 'pong',
      });
    } else {
      message.channel.send('You need to enter a valid command!');
    }
  }
});

async function execute(message, tokens, serverQueue) {
  // check if you are in a voice channel
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
    return message.channel.send(
      'You need to be in a voice channel to play music'
    );
  }

  // check if bot has premission to join vc
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
    return message.channel.send(
      'I need the permissions to join and speak in your voice channel!'
    );
  }

  let songUrl = '';
  if (ytdl.validateURL(tokens[0])) {
    songUrl = tokens[0];
    // valid url
  } else {
    // search for song
    const search = await yts(tokens.join(' '));
    if (search.videos[0]) {
      songUrl = search.videos[0].url;
    }
  }
  const songInfo = await ytdl.getInfo(songUrl);
  const song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url,
  };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      audioplayer: null,
      songs: [],
      volume: 5,
      playing: true,
    };
    queue.set(message.guild.id, queueContruct);
    queueContruct.songs.push(song);
    try {
      let connection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      queueContruct.connection = connection;

      play(message.guild, queueContruct.songs[0], connection);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} has been added to the queue!`);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      'You have to be in a voice channel to stop the music!'
    );
  if (!serverQueue)
    return message.channel.send('There is no song that I could skip!');

  serverQueue.audioplayer.stop();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      'You have to be in a voice channel to stop the music!'
    );

  if (!serverQueue)
    return message.channel.send('There is no song that I could stop!');

  serverQueue.songs = [];
  serverQueue.audioplayer.stop();
}

async function play(guild, song, connection) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    connection.destroy();
    queue.delete(guild.id);
    return;
  }

  const audio = await ytdl(song.url, { filter: 'audioonly' });

  const audioPlayer = voice.createAudioPlayer();
  serverQueue.audioPlayer = audioPlayer;

  const audioResource = createAudioResource(audio);
  serverQueue.audioPlayer.play(audioResource);
  connection.subscribe(audioPlayer);

  const msg = await serverQueue.textChannel.send(
    `Now playing: **${song.title}**`
  );

  // once song finished playing, play next song in queue
  serverQueue.audioPlayer.on(AudioPlayerStatus.Idle, () => {
    serverQueue.songs.shift();
    play(guild, serverQueue.songs[0], connection);
    msg.delete(); // delete now playing message
  });

  serverQueue.audioPlayer.on('error', (error) => console.error(error));
}

function pause(message, serverQueue) {
  serverQueue.audioPlayer.pause();
}

function unpause(message, serverQueue) {
  serverQueue.audioPlayer.unpause();
}

function clear(message, serverQueue) {
  serverQueue.songs = [];
}

function leave(message, connection) {
  connection.destroy();
}
