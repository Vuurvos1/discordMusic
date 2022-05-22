const { URL } = require('url');

const {
  joinVoiceChannel,
  createAudioResource,
  createAudioPlayer,
  AudioPlayerStatus,
} = require('@discordjs/voice');

const ytdl = require('ytdl-core');
const yts = require('yt-search');
const ytsr = require('ytsr');
const { colors } = require('../utils/utils');

module.exports = {
  name: 'play',
  description: 'Play a song',
  aliases: ['p', 'sr'],
  interactionOptions: [
    {
      name: 'song',
      description: 'song name or url',
      type: 3, // type STRING
      required: true,
    },
  ],
  permissions: {
    memberInVoice: true,
  },

  command: async (message, arguments, client) => {
    // if no argument is given
    if (arguments.length < 1) {
      return message.channel.send('Please enter a valid url');
    }

    const voiceChannel = message.member.voice.channel;
    // check if bot has premission to join vc
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
      return message.channel.send(
        'I need the permissions to join and speak in your voice channel!'
      );
    }

    getSong(arguments.join(' '), message, voiceChannel, client);
  },

  interaction: async (interaction, client) => {
    const song = interaction.options.get('song').value;

    // if no argument is given
    if (song.trim().length < 1) {
      const embed = new MessageEmbed()
        .setColor(colors.error)
        .setDescription('Please enter a valid argument');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const voiceChannel = interaction.member.voice.channel;

    // check if bot has premission to join vc
    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
      const embed = new MessageEmbed()
        .setColor(colors.error)
        .setDescription(
          'I need the permissions to join and speak in your voice channel!'
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    getSong(song, interaction, voiceChannel, client);
  },
};

async function getSong(song, message, voiceChannel, client) {
  let songs;
  const guildQueue = client.queue.get(message.guild.id);

  // if youtube url
  if (song.match(/^http(s)?:\/\/(www.youtube.com|youtube.com)(.*)$/)) {
    const url = new URL(song);
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

        if (message.commandName) {
          message.reply(`Added **${songs.length}** songs to the queue!`);
        } else {
          message.channel.send(`Added **${songs.length}** songs to the queue!`);
        }
      } else {
        if (message.commandName) {
          message.reply("Couldn't find playlist");
        } else {
          message.channel.send("Couldn't find playlist");
        }
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

      if (message.commandName) {
        message.reply(`${songs.title} has been added to the queue!`);
      } else {
        message.channel.send(`${songs.title} has been added to the queue!`);
      }
    }
  } else {
    // search for song
    const { items } = await ytsr(song, { limit: 10 });

    // maybe this caused the undefined video id?
    if (items.length > 1 && items[0].id) {
      const { title, duration, id } = items[0];

      songs = {
        title: title,
        duration: duration,
        id: id,
      };

      if (message.commandName) {
        message.reply(`${songs.title} has been added to the queue!`);
      } else {
        message.channel.send(`${songs.title} has been added to the queue!`);
      }
    } else {
      // no song found
      if (message.commandName) {
        message.reply(`Couldn't find a song`);
      } else {
        message.channel.send(`Couldn't find a song`);
      }
    }
  }

  if (!guildQueue) {
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
    if (guildQueue.songs.length < 1) {
      guildQueue.songs = guildQueue.songs.concat(songs);
      play(message.guild, guildQueue.songs[0], guildQueue.connection, client);
    } else {
      guildQueue.songs = guildQueue.songs.concat(songs);
    }
  }
}

async function play(guild, song, connection, client) {
  const queue = client.queue;
  const guildQueue = queue.get(guild.id);

  if (!song) {
    setTimeout(() => {
      // if still no songs in queue
      if (guildQueue.songs.length < 1) {
        // leave voice channel
        if (queue.get(guild.id)) {
          connection.destroy();
          queue.delete(guild.id);
        }
      }
    }, 3 * 60 * 1000); // 3 minutes
    return;
  }

  if (!guildQueue.audioPlayer) {
    const audioPlayer = createAudioPlayer();

    // once song finished playing, play next song in queue
    audioPlayer.on(AudioPlayerStatus.Idle, () => {
      // vc is empty
      if (guildQueue.voiceChannel.members.size <= 1 && connection) {
        // leave voice channel
        if (queue.get(guild.id)) {
          connection.destroy();
          queue.delete(guild.id);
        }
        return;
      }

      guildQueue.songs.shift();
      play(guild, guildQueue.songs[0], connection, client);
      if (guildQueue.msg) {
        guildQueue.msg.delete(); // delete now playing mewwssage
      }
    });

    audioPlayer.on('error', (err) => console.error(err));

    guildQueue.audioPlayer = audioPlayer;
    connection.subscribe(audioPlayer);
  }

  const options = {
    filter: 'audioonly',
    quality: 'highestaudio',
    highWaterMark: 1 << 25,
  };

  // Probe stream for optimize?
  try {
    const info = await ytdl.getInfo(song.id, options);
    const stream = ytdl.downloadFromInfo(info);
    const resource = createAudioResource(stream);

    guildQueue.audioPlayer.play(resource);

    guildQueue.msg = await guildQueue.textChannel.send(
      `Now playing: **${song.title}**`
    );
  } catch (err) {
    console.log(err);
  }
}
