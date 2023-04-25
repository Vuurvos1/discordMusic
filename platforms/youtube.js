import ytdl from 'ytdl-core';
import { URL } from 'node:url';
import { default as youtube } from 'youtube-sr';

import { createAudioResource } from '@discordjs/voice';

/** @type {import('../index.js').PlatformInterface} */
export default {
	name: 'youtube',

	matcher(string) {
		// youtube, video, music / playlist, live / shorts, m.youtube, short/share link
		return /(www.youtube.com|youtube.com|www.youtu.be|youtu.be.be|www.music.youtube.com|music.youtube.com|m.youtube.com)/.test(
			string
		);
	},
	async getSong({ args }) {
		const url = new URL(args[0]);

		if (!url) throw new Error('Invalid URL');

		// if (false) {
		// 	// search
		// }

		// playlist
		if (url.searchParams.has('list')) {
			try {
				const playlist = await youtube.getPlaylist(args[0], { fetchAll: true });

				/** @type {import('../index').Song[]} */
				return playlist.videos.map((video) => {
					// TODO: test for unlisted/private?
					// This could be slow creating a bunch of new objects
					return {
						title: video.title || 'unkown',
						id: video.id,
						artist: 'unkown',
						platform: 'youtube',
						message: 'Twitch vod',
						user: 'unkown',
						duration: video.durationFormatted,
						url: `https://youtu.be/${video.id}`,
						live: video.live
						// user: message.author.id
					};
				});
			} catch (error) {
				console.error(error);
				throw new Error("Couldn't find playlist");
			}
		}

		// TODO: fix stream

		// normal video
		try {
			const songData = await youtube.getVideo(args[0]);

			const song = {
				title: songData.title,
				platform: 'youtube',
				duration: songData.durationFormatted,
				id: songData.id,
				url: `https://youtu.be/${songData.id}`,
				live: songData.live
			};

			return [song];
		} catch (error) {
			throw new Error("Couldn't find song");
		}

		// throw new Error('Not implemented');
	},
	async getResource(song) {
		if (song.live) {
			// filter: 'audioonly',
			const stream = await ytdl(song.url, {
				highWaterMark: 1 << 25,
				filter: (format) => format.isHLS
			});

			return createAudioResource(stream);
		}

		const stream = await ytdl(song.url, {
			filter: 'audioonly',
			quality: 'highestaudio',
			highWaterMark: 1 << 25
		});

		return createAudioResource(stream);
	}
};
