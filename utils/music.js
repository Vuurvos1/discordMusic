import { URL } from 'node:url';
// import { demuxProbe, createAudioResource } from '@discordjs/voice';
import { isValidUrl } from './utils.js';

import { platforms } from '../platforms/index.js';

/**
 *  @param {string[]} args
 * 	@returns {Promise<import('../').SearchSong>}
 */
export async function searchSong(args) {
	if (args.length === 1 && isValidUrl(args[0])) {
		const url = new URL(args[0]);

		// TODO: soundcloud
		for (const [key, platform] of platforms) {
			const match = platform.matcher(url.host);

			if (!match) continue;

			const data = await platform.getAudio({ args });

			console.log(data);

			if (data.error) {
				return {
					message: data.error,
					songs: [],
					error: true
				};
			}

			return {
				message: key,
				songs: data.data,
				error: false
			};
		}
	}

	// search for video on youtube
	try {
		const youtubePlatform = platforms.get('youtube');
		if (!youtubePlatform) throw new Error('youtube platform not found');

		const song = await youtubePlatform.getAudio({ args });

		if (song.error) {
			return {
				message: song.error,
				songs: [],
				error: true
			};
		}

		return {
			message: '', // added ... to the queue
			songs: song.data,
			error: false
		};
	} catch (error) {
		console.error(error);
	}

	return {
		message: '',
		songs: [],
		error: true
	};
}

// TODO: reimpliment?
// export async function probeAndCreateResource(readableStream) {
// 	const { stream, type } = await demuxProbe(readableStream);
// 	return createAudioResource(stream, { inputType: type });
// }
