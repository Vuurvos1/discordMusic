import { URL } from 'node:url';

import ytdl from 'ytdl-core';

import { MINUTES, leaveVoiceChannel } from '../utils/utils.js';

import {
  joinVoiceChannel,
  createAudioResource,
  createAudioPlayer,
  AudioPlayerStatus,
} from '@discordjs/voice';

import { EmbedBuilder } from 'discord.js';
import { queuedEmbed, defaultEmbed, errorEmbed } from '../utils/embeds.js';
import { demuxProbe } from '@discordjs/voice';

import { getSong as getSongUtil, getPlaylist } from '../utils/music.js';

export default {
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

  command: async (message, args, client) => {
    // if no argument is given
    if (args.length < 1) {
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

    getSong(args, message, voiceChannel, client);
  },

  interaction: async (interaction, client) => {
    const song = interaction.options.get('song').value;

    // if no argument is given
    if (song.trim().length < 1) {
      return interaction.reply({
        embeds: [errorEmbed('Please enter a valid argument')],
        ephemeral: true,
      });
    }

    const voiceChannel = interaction.member.voice.channel;

    // check if bot has premission to join vc
    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            'I need the permissions to join and speak in your voice channel!'
          ),
        ],
        ephemeral: true,
      });
    }

    getSong([song], interaction, voiceChannel, client);
  },
};

async function getSong(args, message, voiceChannel, client) {
  let guildQueue = client.queue.get(message.guild.id);

  if (!guildQueue) {
    // add current song?
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      songMessage: null,
      connection: null,
      audioPlayer: null,
      songs: [],
      volume: 5,
      playing: false,
      paused: false,
      looping: false,
    };

    client.queue.set(message.guild.id, queueContruct);
    guildQueue = client.queue.get(message.guild.id);
  }

  guildQueue.textChannel = message.channel; // updated each time a song is added

  const song = args[0];

  // if youtube url
  if (song.match(/^http(s)?:\/\/(www.youtube.com|youtube.com)(.*)$/)) {
    const url = new URL(song);
    const params = url.searchParams; // get url parameters

    // url contains a playlist
    if (params.has('list')) {
      // add playlist to queue
      const { songs, error } = await getPlaylist(message, args);

      if (!error) {
        guildQueue.songs = guildQueue.songs.concat(songs);

        if (message.commandName) {
          // slash command
          message.reply({
            embeds: [defaultEmbed(`Queued **${songs.length}** songs`)],
            ephemeral: false,
          });
        } else {
          // text command
          message.channel.send({
            embeds: [defaultEmbed(`Queued **${songs.length}** songs`)],
          });
        }
      }
    } else {
      // get single video by id
      const { song, error } = await getSongUtil(message, args);

      if (!error) {
        guildQueue.songs = guildQueue.songs.concat(song);

        if (message.commandName) {
          // slash command
          message.reply({
            embeds: [queuedEmbed(message, song)],
            ephemeral: false,
          });
        } else {
          // text command
          message.channel.send({ embeds: [queuedEmbed(message, song)] });
        }
      }
    }
  } else {
    // search for song
    const { song, error } = await getSongUtil(message, args);
    if (!error) {
      guildQueue.songs = guildQueue.songs.concat(song);

      // if not first song in queue send queued message
      if (guildQueue && guildQueue?.songs?.length !== 0) {
        if (message.commandName) {
          // slash command
          message.reply({
            embeds: [queuedEmbed(message, song)],
            ephemeral: false,
          });
        } else {
          // text command
          message.channel.send({ embeds: [queuedEmbed(message, song)] });
        }
      }
    }
  }

  try {
    let connection = joinVoiceChannel({
      channelId: message.member.voice.channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    guildQueue.connection = connection;

    if (!guildQueue.playing) {
      // play song
      guildQueue.playing = true;
      play(message.guild, guildQueue.songs[0], connection, client);
    }
  } catch (error) {
    console.log(error);
    queue.delete(message.guild.id);
    return message.channel.send(error);
  }
}

async function play(guild, song, connection, client) {
  const queue = client.queue;
  const guildQueue = queue.get(guild.id);

  if (!song) {
    if (guildQueue.songMessage) {
      guildQueue.songMessage.delete();
      guildQueue.songMessage = undefined;
    }

    guildQueue.playing = false;

    setTimeout(() => {
      // if still no songs in queue
      if (guildQueue.songs.length < 1) {
        // leave voice channel
        // TODO bug send not a function?
        guildQueue.textChannel.send('No more songs to play');
        leaveVoiceChannel(queue, guild.id);
      }
    }, 10 * MINUTES);
    return;
  }

  if (!guildQueue.audioPlayer) {
    const audioPlayer = createAudioPlayer();

    // once song finished playing, play next song in queue
    audioPlayer.on(AudioPlayerStatus.Idle, () => {
      guildQueue.songs.shift();
      play(guild, guildQueue.songs[0], connection, client);
    });

    audioPlayer.on('error', (error) => console.error(error));

    guildQueue.audioPlayer = audioPlayer;
    connection.subscribe(audioPlayer);
  }

  try {
    const stream = await ytdl(song.url, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25,
    });

    const resource = await probeAndCreateResource(stream);

    guildQueue.audioPlayer.play(resource);

    // delete old song message
    if (guildQueue.songMessage) {
      await guildQueue.songMessage.delete();
    }

    const embed = new EmbedBuilder()
      .setTitle('Now Playing')
      .setDescription(
        `[${
          song.title.length > 60
            ? song.title.substring(0, 60 - 1) + '…'
            : song.title
        }](${song.url})`
      );

    // TODO bug send not a function?
    if (guildQueue.textChannel) {
      guildQueue.songMessage = await guildQueue.textChannel.send({
        embeds: [embed],
      });
    }
  } catch (error) {
    console.log(error);
  }
}

async function probeAndCreateResource(readableStream) {
  const { stream, type } = await demuxProbe(readableStream);
  return createAudioResource(stream, { inputType: type });
}
