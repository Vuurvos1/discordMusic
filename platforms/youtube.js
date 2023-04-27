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

		// playlist
		if (url.searchParams.has('list')) {
			try {
				const playlist = await youtube.getPlaylist(args[0], { fetchAll: true });

				/** @type {import('../index').Song[]} */
				const songs = [];

				playlist.videos.forEach((video) => {
					// TODO: test for unlisted/private?
					// This could be slow creating a bunch of new objects
					songs.push({
						title: video.title || 'unkown',
						id: video.id,
						artist: 'unkown',
						user: 'unkown', // message.author.id
						platform: 'youtube',
						message: 'Youtube video',
						duration: video.durationFormatted,
						url: `https://youtu.be/${video.id}`,
						live: false
					});
				});
				return songs;
			} catch (err) {
				console.error(err);
				throw new Error("Couldn't find playlist");
			}
		}

		// TODO: fix stream
		// normal video
		try {
			const songData = await youtube.getVideo(args[0]);

			/** @type {import('../index').Song} */
			const song = {
				title: songData.title || 'unkown',
				platform: 'youtube',
				duration: songData.durationFormatted,
				id: songData.id,
				url: `https://youtu.be/${songData.id}`,
				live: songData.live,
				artist: 'unkown',
				message: 'Youtube video',
				user: 'unkown' // message.author.id
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
