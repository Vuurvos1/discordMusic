require('dotenv').config();

const { URL } = require('url');

const DiscordJS = require('discord.js');
const { Intents } = require('discord.js');
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

client.on('ready', async () => {
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

client.on('messageCreate', (message) => {
  const tokens = message.content.split(' ');
  let command = tokens.shift();

  if (!message.author.bot && command[0] == prefix) {
    const serverQueue = queue.get(message.guild.id);

    // remove prefix from command
    command = command.substring(1);

    // convert to switch / controller object?
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
    } else if (command === 'shuffle') {
      shuffle(message, serverQueue);
    } else if (command === 'queue' || command === 'q') {
      queueCommand(message, serverQueue);
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

  let songs;

  // if youtube url
  if (tokens[0].match(/^http(s)?:\/\/(www.youtube.com|youtube.com)(.*)$/)) {
    const url = new URL(tokens[0]);
    const params = url.searchParams; // get url parameters

    // url contains a playlist
    if (params.has('list')) {
      // add playlist to queue
      const listId = params.get('list');
      const list = await yts({ listId: listId });

      // merge song objects?
      if (list.videos.length > 0) {
        songs = [];
        list.videos.forEach((video) => {
          songs.push({
            title: video.title,
            duration: video.duration.timestamp,
            id: video.videoId,
          });
        });

        message.channel.send(`Added **${songs.length}** songs to the queue!`);
      } else {
        message.channel.send(`Couldn't find playlist`);
      }
    } else {
      // get single video by id
      videoId = params.get('v');
      const video = await yts({ videoId: videoId });

      songs = {
        title: video.title,
        duration: video.duration.timestamp,
        id: video.videoId,
      };

      message.channel.send(`${songs.title} has been added to the queue!`);
    }
  } else {
    // search for song
    const search = await yts(tokens.join(' '));
    if (search.videos[0]) {
      const video = search.videos[0];

      songs = {
        title: video.title,
        duration: video.duration.timestamp,
        id: video.videoId,
      };

      message.channel.send(`${songs.title} has been added to the queue!`);
    } else {
      // no song found
      message.channel.send(`Couldn't find a song`);
    }
  }

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      msg: null,
      connection: null,
      audioPlayer: null,
      songs: [],
      volume: 5,
      playing: true,
    };
    queue.set(message.guild.id, queueContruct);
    queueContruct.songs = queueContruct.songs.concat(songs);

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
    serverQueue.songs = serverQueue.songs.concat(songs);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      'You have to be in a voice channel to stop the music!'
    );
  if (!serverQueue)
    return message.channel.send('There is no song that I could skip!');

  serverQueue.audioPlayer.stop();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      'You have to be in a voice channel to stop the music!'
    );

  if (!serverQueue)
    return message.channel.send('There is no song that I could stop!');

  serverQueue.songs = [];
  serverQueue.audioPlayer.stop();
}

async function play(guild, song, connection) {
  const serverQueue = queue.get(guild.id);

  if (!song) {
    connection.destroy();
    queue.delete(guild.id);
    return;
  }

  if (!serverQueue.audioPlayer) {
    const audioPlayer = createAudioPlayer();

    // once song finished playing, play next song in queue
    audioPlayer.on(AudioPlayerStatus.Idle, () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0], connection);
      if (serverQueue.msg) {
        serverQueue.msg.delete(); // delete now playing mewwssage
      }
    });

    audioPlayer.on('error', (err) => console.error(err));

    serverQueue.audioPlayer = audioPlayer;
    connection.subscribe(audioPlayer);
  }

  const audio = await ytdl(song.id, {
    filter: 'audioonly',
    quality: 'lowest',
  });
  const resource = createAudioResource(audio);
  serverQueue.audioPlayer.play(resource);

  serverQueue.msg = await serverQueue.textChannel.send(
    `Now playing: **${song.title}**`
  );
}

function pause(message, serverQueue) {
  serverQueue.audioPlayer.pause();
  return message.channel.send('Paused music');
}

function unpause(message, serverQueue) {
  serverQueue.audioPlayer.unpause();
  return message.channel.send('Unpaused music');
}

function shuffle(message, serverQueue) {
  serverQueue.songs.sort(() => Math.random() - 0.5);
  return message.channel.send('Queue shuffled');
}

function queueCommand(message, serverQueue) {
  const songs = serverQueue.songs.slice(0, 5); // get first 5 songs

  if (songs.length < 1) {
    return message.channel.send('```nim\nThe queue is empty ;-;`\n```');
  }

  let queueMsg = '```nim\n';

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    if (i === 0) {
      queueMsg += '    ⬐ current track\n';
    }

    queueMsg += `${i + 1}) ${
      song.title.length > 40
        ? song.title.substring(0, 40 - 1) + '…'
        : song.title.padEnd(40, ' ')
    } ${song.duration}\n`;
    // TODO show time left for current song `2:39 left`

    if (i === 0) {
      queueMsg += '    ⬑ current track\n';
    }
  }

  queueMsg += '```';

  return message.channel.send(queueMsg);
}

function clear(message, serverQueue) {
  serverQueue.songs = [];
  message.channel.send('Cleared the queue');
}

function leave(message, connection) {
  connection.destroy();
}
