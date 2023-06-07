import ytdl from 'ytdl-core';
import { URL } from 'node:url';
import { default as youtube } from 'youtube-sr';

import { createAudioResource } from '@discordjs/voice';
import { isValidUrl } from '../utils/utils.js';

/** @type {import('../index.js').PlatformInterface} */
export default {
	name: 'youtube',
	matcher(string) {
		// youtube, video, music / playlist, live / shorts, m.youtube, short/share link
		return /(www.youtube.com|youtube.com|www.youtu.be|youtu.be|www.music.youtube.com|music.youtube.com|m.youtube.com)/.test(
			string
		);
	},
	async getSong({ args }) {
		const isUrl = isValidUrl(args[0]);
		const searchArg = isUrl ? args[0] : args.join(' ');

		// playlist
		if (isUrl && new URL(searchArg).searchParams.has('list')) {
			try {
				const playlist = await youtube.getPlaylist(searchArg, { fetchAll: true });

				/** @type {import('../').Song[]} */
				const songs = [];

				playlist.videos.forEach((video) => {
					// TODO: test for unlisted/private?
					// This could be slow creating a bunch of new objects
					songs.push({
						title: video.title || 'unkown',
						id: video.id || 'unkown',
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

		// normal video
		try {
			const video = isUrl ? await youtube.getVideo(searchArg) : await youtube.searchOne(searchArg);

			/** @type {import('../index').Song} */
			const song = {
				title: video.title || 'unkown',
				platform: 'youtube',
				duration: video.durationFormatted,
				id: video.id || '',
				url: `https://youtu.be/${video.id}`,
				live: video.live,
				artist: video.channel?.name || 'unkown',
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
			const info = await ytdl.getInfo(song.url);
			const formats = ytdl.filterFormats(info.formats, (format) => {
				return format.isHLS && format.itag === 95;
			});

			// const stream = await ytdl(song.url, {
			// 	highWaterMark: 1 << 25,
			// 	filter: (format) => format.isHLS && format.itag === 95
			// });

			return createAudioResource(formats[0].url);
		}

		const stream = await ytdl(song.url, {
			filter: 'audioonly',
			quality: 'highestaudio',
			highWaterMark: 1 << 25
		});

		return createAudioResource(stream);
	}
};
