import { URL } from 'node:url';
import { createAudioResource } from '@discordjs/voice';
import { isValidUrl } from '../utils/utils.js';
import { YouTube } from 'youtube-sr';
import play from 'play-dl';

/** @type {import('../').PlatformInterface} */
export default {
	name: 'youtube',
	matcher(string) {
		// youtube, video, music / playlist, live / shorts, m.youtube, short/share link
		return /(www.youtube.com|youtube.com|www.youtu.be|youtu.be|www.music.youtube.com|music.youtube.com|m.youtube.com)/.test(
			string
		);
	},
	async getAudio({ args }) {
		const isUrl = isValidUrl(args[0]);
		const searchArg = isUrl ? args[0] : args.join(' ');

		// playlist
		if (isUrl && new URL(searchArg).searchParams.has('list')) {
			try {
				const playlist = await YouTube.getPlaylist(searchArg, { fetchAll: true });

				// no playlist found / private
				if (!playlist) return { data: [], error: "Couldn't find playlist" };

				/** @type {import('../').Song[]} */
				const songs = [];

				playlist.videos.forEach((video) => {
					// This could be slow creating a bunch of new objects
					songs.push({
						title: video.title || 'unknown',
						id: video.id || 'unknown',
						artist: 'unknown',
						user: 'unknown', // message.author.id
						platform: 'youtube',
						message: 'Youtube video',
						duration: video.durationFormatted,
						url: `https://youtu.be/${video.id}`,
						live: false
					});
				});
				return { data: songs };
			} catch (error) {
				// console.error(error);
				return {
					data: [],
					error: "Couldn't find playlist"
				};
			}
		}

		// normal video
		try {
			const video = isUrl ? await YouTube.getVideo(searchArg) : await YouTube.searchOne(searchArg);

			/** @type {import('../').Song} */
			const song = {
				title: video.title || 'unknown',
				platform: 'youtube',
				duration: video.durationFormatted,
				id: video.id || '',
				url: `https://youtu.be/${video.id}`,
				live: video.live,
				artist: video.channel?.name || 'unknown',
				message: 'Youtube video',
				user: 'unknown' // message.author.id
			};
			return { data: [song] };
		} catch (error) {
			console.error(error);
			return {
				data: [],
				error: "Couldn't find song"
			};
		}
	},
	async getResource(song) {
		const stream = await play.stream(song.url);

		const resource = createAudioResource(stream.stream, {
			inputType: stream.type
		});

		return resource;
	}
};
