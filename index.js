require('dotenv').config();
const { botToken } = process.env;

const { URL } = require('url');

const { Intents, Client } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioResource,
  createAudioPlayer,
  demuxProbe,
  AudioPlayerStatus,
} = require('@discordjs/voice');

const prefix = '!';

const ytdl = require('ytdl-core');
const yts = require('yt-search');
const ytsr = require('ytsr');

const commands = {
  play: execute,
  p: execute,
  skip: skip,
  s: skip,
  stop: stop,
  pause: pause,
  unpause: unpause,
  leave: leave,
  shuffle: shuffle,
  clear: clear,
  queue: queueCommand,
  q: queueCommand,
  ping: ping,
};

const client = new Client({
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

    if (commands[command]) {
      commands[command](message, tokens, serverQueue);
    } else {
      message.channel.send('Please enter a valid command!');
    }
  }
});

async function execute(message, tokens, serverQueue) {
  if (tokens.length < 1) {
    // if no argument is given
    return message.channel.send('Please enter a valid argument');
  }

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
        message.channel.send("Couldn't find playlist");
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
    const search = await ytsr(tokens.join(' '), { limit: 10 });
    // maybe this caused the undefined video id?
    if (search.items.length > 1 && search.items[0].id) {
      const video = search.items[0];

      songs = {
        title: video.title,
        duration: video.duration,
        id: video.id,
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
    if (serverQueue.songs.length < 1) {
      serverQueue.songs = serverQueue.songs.concat(songs);
      play(message.guild, serverQueue.songs[0], serverQueue.connection);
    } else {
      serverQueue.songs = serverQueue.songs.concat(songs);
    }
  }
}

function skip(message, tokens, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      'You have to be in a voice channel to stop the music!'
    );
  if (!serverQueue)
    return message.channel.send('There is no song that I could skip!');

  serverQueue.audioPlayer.stop();
}

function stop(message, tokens, serverQueue) {
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
    setTimeout(() => {
      // if still no songs in queue
      if (serverQueue.songs.length < 1) {
        // leave voice channel
        if (queue.get(guild.id)) {
          connection.destroy();
          queue.delete(guild.id);
        }
      }
    }, 3 * 60 * 1000); // 3 minutes
    return;
  }

  if (!serverQueue.audioPlayer) {
    const audioPlayer = createAudioPlayer();

    // once song finished playing, play next song in queue
    audioPlayer.on(AudioPlayerStatus.Idle, () => {
      // vc is empty
      if (serverQueue.voiceChannel.members.size <= 1 && connection) {
        // leave voice channel
        if (queue.get(guild.id)) {
          connection.destroy();
          queue.delete(guild.id);
        }
        return;
      }

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

  const audio = ytdl(song.id, {
    filter: 'audioonly',
    quality: 'lowest',
  });

  demuxProbe(audio)
    .then(async (probe) => {
      const resource = createAudioResource(probe.stream, {
        inputType: probe.type,
      });
      serverQueue.audioPlayer.play(resource);

      serverQueue.msg = await serverQueue.textChannel.send(
        `Now playing: **${song.title}**`
      );
    })
    .catch((err) => {
      console.error(err);
    });
}

function pause(message, tokens, serverQueue) {
  serverQueue.audioPlayer.pause();
  return message.channel.send('Paused music');
}

function unpause(message, tokens, serverQueue) {
  serverQueue.audioPlayer.unpause();
  return message.channel.send('Unpaused music');
}

function shuffle(message, tokens, serverQueue) {
  serverQueue.songs.sort(() => Math.random() - 0.5);
  return message.channel.send('Queue shuffled');
}

function queueCommand(message, tokens, serverQueue) {
  if (!serverQueue || serverQueue?.songs.length < 1) {
    return message.channel.send('```nim\nThe queue is empty ;-;`\n```');
  }

  const songs = serverQueue.songs.slice(0, 5); // get first 5 songs

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

function clear(message, tokens, serverQueue) {
  serverQueue.songs = [];
  message.channel.send('Cleared the queue');
}

function leave(message, tokens, serverQueue) {
  // add not in vc state
  if (!serverQueue) {
    return message.channel.send("I'm currently not in a voice channel");
  }

  serverQueue.connection.destroy();
  queue.delete(message.guild.id);
}

function ping(message, tokens, serverQueue) {
  message.channel.send('pong');
}
