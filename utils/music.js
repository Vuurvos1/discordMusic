const ytdl = require('ytdl-core');
const youtube = require('youtube-sr').default;

const { URL } = require('url');

const { errorEmbed } = require('./embeds');

async function getPlaylist(message, args) {
  const url = new URL(args[0]);
  const params = url.searchParams; // get url parameters
  const listId = params.get('list');

  const playlistPart = await youtube.getPlaylist(listId);
  const playlist = await playlistPart.fetch();

  if (playlist.videos.length > 0) {
    let songs = [];
    playlist.videos.forEach((video) => {
      songs.push({
        title: video.title,
        duration: video.durationFormatted,
        id: video.id,
        url: `https://youtu.be/${video.id}`,
      });
    });

    return {
      songs,
      error: false,
    };
  } else {
    if (message.commandName) {
      // slash command
      message.reply({
        embeds: [errorEmbed("Couldn't find playlist")],
        ephemeral: true,
      });
    } else {
      // text command
      message.channel.send({
        embeds: [errorEmbed("Couldn't find playlist")],
      });
    }

    return {
      songs: [],
      error: true,
    };
  }
}

async function getSong(message, args) {
  const url = args[0];
  const validUrl = url.match(
    /^(http(s)?:\/\/)?((w{3}\.)?youtu(be|.be)?|(m|music)\.youtube\.com)\/.+/
  );

  if (validUrl) {
    // if url
    const songInfo = await ytdl.getInfo(url);

    if (songInfo) {
      const song = {
        title: songInfo.title,
        duration: songInfo.duration,
        id: songInfo.video_id,
        url: songInfo.video_url,
      };

      return {
        song,
        error: false,
      };
    } else {
      // no song found
      if (message.commandName) {
        message.reply({
          embeds: [errorEmbed(`Couldn't find song`)],
          ephemeral: true,
        });
      } else {
        message.channel.send({ embeds: [errorEmbed(`Couldn't find song`)] });
      }

      return {
        song: {},
        error: true,
      };
    }
  } else {
    // search for video by title
    const search = args.join(' ');
    const items = await youtube.search(search, { limit: 2 });

    if (items.length >= 1 && items[0].id) {
      const { title, durationFormatted, id } = items[0];

      const song = {
        title,
        duration: durationFormatted,
        id,
        url: `https://youtu.be/${id}`,
      };

      return {
        song,
        error: false,
      };
    } else {
      // no song found
      if (message.commandName) {
        message.reply({
          embeds: [errorEmbed(`Couldn't find song`)],
          ephemeral: true,
        });
      } else {
        message.channel.send({ embeds: [errorEmbed(`Couldn't find song`)] });
      }

      return {
        song: {},
        error: true,
      };
    }
  }
}

module.exports = {
  getPlaylist,
  getSongUtil: getSong,
};
