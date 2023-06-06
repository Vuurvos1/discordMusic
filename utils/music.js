import { URL } from 'node:url';
// import { demuxProbe, createAudioResource } from '@discordjs/voice';
import { isValidUrl } from './utils.js';

import { platforms } from '../platforms/index.js';

/**
 *  @param {string[]} args
 * 	@returns {Promise<import('../index').SearchSong>}
 */
export async function searchSong(args) {
	if (args.length === 1 && isValidUrl(args[0])) {
		const url = new URL(args[0]);

		// TODO: soundcloud
		for (const [key, platform] of platforms) {
			if (platform.matcher(url.host)) {
				try {
					return {
						message: key,
						songs: (await platform.getSong({ args })) || [],
						error: false
					};
				} catch (err) {
					return {
						message: err,
						songs: [],
						error: true
					};
				}
			}
		}
	}

	// search for video on youtube
	try {
		const youtubePlatform = platforms.get('youtube');
		if (!youtubePlatform) throw new Error('youtube platform not found');

		const song = await youtubePlatform.getSong({ args });

		return {
			message: '', // added ... to the queue
			songs: song || [],
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
