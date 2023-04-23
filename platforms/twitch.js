import { createAudioResource } from '@discordjs/voice';
// import twitch from 'twitch-m3u8';

/** @type {import('../index.js').PlatformInterface} */
export default {
	name: 'twitch',
	matcher(string) {
		return /https?:\/\/(www\.)?twitch\.tv\/.+/.test(string);
	},

	getSong() {
		throw new Error('Not implemented');

		// return null;
	},

	getResource() {
		// const streamLink = await twitch.getStream(song.title).then((data) => {
		//   return data.at(-1).url;
		// });
		const streamLink = '';
		return createAudioResource(streamLink);
	}
};
