import { createAudioResource } from '@discordjs/voice';
import twitch from 'twitch-m3u8';

/** @type {import('../').PlatformInterface} */
export default {
	name: 'twitch',
	matcher(string) {
		return /twitch.tv/.test(string);
	},

	async getAudio({ args }) {
		const url = new URL(args[0]);

		const slugs = url.pathname.match(/[^/]+/g); // get url slugs, by splitting the pathname by /

		if (!slugs) return { data: [], error: 'Invalid url' };

		// TODO: properly add twitch meta data

		// live/user
		try {
			if (slugs.length === 1) {
				const streamData = await twitch.getStream(slugs[0]);
				return {
					data: [
						{
							title: 'Twitch stream', // streamData.at(-1).title
							id: streamData.at(-1).url,
							artist: slugs[0],
							platform: 'twitch',
							message: 'Twitch stream',
							url: args[0],
							user: 'unknown', // message.author.id
							live: true
							// duration: 'unknown',
						}
					]
				};
			}
		} catch (error) {
			console.error(error);
			return {
				data: [],
				error: "Couldn't user or stream"
			};
		}

		// vod
		if (slugs[0] === 'videos') {
			try {
				const streamData = await twitch.getVod(slugs[1]);

				return {
					data: [
						{
							title: 'Twitch vod', // streamData.at(-1).title
							id: streamData.at(-1).url,
							artist: 'unknown', // streamData.at(-1).channel.display_name
							platform: 'twitch',
							message: 'Twitch vod',
							url: args[0],
							user: 'unknown', // message.author.id
							live: false
							// duration: 'unknown',
						}
					]
				};
			} catch (error) {
				console.error(error);
				return {
					data: [],
					error: "Couldn't find vod"
				};
			}

			// TODO: clips
		}

		return {
			data: [],
			error: "Couldn't find song"
		};
	},

	async getResource(song) {
		if (!song.live) {
			return createAudioResource(song.id);
		}

		// TODO: fix stream playback randomly stopping
		/** @type {{quality: string; resolution: string; url: string}[]} */
		const streamData = await twitch.getStream(song.artist);
		const filtered = streamData.filter((stream) => stream.quality === 'audio_only');
		const streamLink = filtered[0].url;

		return createAudioResource(streamLink);
	}
};
