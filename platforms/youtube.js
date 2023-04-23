import { createAudioResource } from '@discordjs/voice';

/** @type {import('../index.js').PlatformInterface} */
export default {
	name: 'youtube',

	matcher(string) {
		return /https?:\/\/(www\.)?youtube\.com\/watch\?v=.+/.test(string);
	},
	getSong() {
		throw new Error('Not implemented');

		// return null;
	},
	getResource() {
		// 	if (song.live) {
		// 		// filter: 'audioonly',
		// 		const stream = await ytdl(song.url, {
		// 			highWaterMark: 1 << 25,
		// 			filter: (format) => format.isHLS
		// 		});

		// 		return createAudioResource(stream);
		// 	}

		// 	const stream = await ytdl(song.url, {
		// 		filter: 'audioonly',
		// 		quality: 'highestaudio',
		// 		highWaterMark: 1 << 25
		// 	});

		// 	return createAudioResource(stream);

		return createAudioResource('');
	}
};
