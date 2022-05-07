const { URL } = require('url');

const {
  joinVoiceChannel,
  createAudioResource,
  createAudioPlayer,
  demuxProbe,
  AudioPlayerStatus,
} = require('@discordjs/voice');

const ytdl = require('ytdl-core');
const yts = require('yt-search');
const ytsr = require('ytsr');

module.exports = {
  name: 'play',
  description: 'Play a song',
  aliases: ['p', 'sr'],
  command: async (message, arguments, serverQueue, client) => {
    // if no argument is given
    if (arguments.length < 1) {
      return message.channel.send('Please enter a valid url');
    }

    // check if bot has premission to join vc
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
      return message.channel.send(
        'I need the permissions to join and speak in your voice channel!'
      );
    }

    // check if you are in a voice channel
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.channel.send(
        'You need to be in a voice channel to play music'
      );
    }

    let songs;

    // if youtube url
    if (
      arguments[0].match(/^http(s)?:\/\/(www.youtube.com|youtube.com)(.*)$/)
    ) {
      const url = new URL(arguments[0]);
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
      const search = await ytsr(arguments.join(' '), { limit: 10 });
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
      client.queue.set(message.guild.id, queueContruct);
      queueContruct.songs = queueContruct.songs.concat(songs);

      try {
        let connection = joinVoiceChannel({
          channelId: message.member.voice.channel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
        });

        queueContruct.connection = connection;

        play(message.guild, queueContruct.songs[0], connection, client);
      } catch (err) {
        console.log(err);
        queue.delete(message.guild.id);
        return message.channel.send(err);
      }
    } else {
      if (serverQueue.songs.length < 1) {
        serverQueue.songs = serverQueue.songs.concat(songs);
        play(
          message.guild,
          serverQueue.songs[0],
          serverQueue.connection,
          client
        );
      } else {
        serverQueue.songs = serverQueue.songs.concat(songs);
      }
    }
  },
};

async function play(guild, song, connection, client) {
  const queue = client.queue;
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
      play(guild, serverQueue.songs[0], connection, client);
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
