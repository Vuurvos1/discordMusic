import { createAudioResource } from '@discordjs/voice';
import twitch from 'twitch-m3u8';

/** @type {import('../index.js').PlatformInterface} */
export default {
	name: 'twitch',
	matcher(string) {
		return /twitch.tv/.test(string);
	},

	async getSong({ args }) {
		const url = new URL(args[0]);

		const slugs = url.pathname.match(/[^/]+/g); // get url slugs, by splitting the pathname by /

		if (!slugs) return null; // please enter a valid url

		// TODO: properly add twitch meta data

		// live/user
		try {
			if (slugs.length === 1) {
				const streamData = await twitch.getStream(slugs[0]);
				return [
					{
						title: 'Twitch stream', // streamData.at(-1).title
						id: streamData.at(-1).url,
						artist: slugs[0],
						platform: 'twitch',
						message: 'Twitch stream',
						url: args[0],
						user: 'unkown', // message.author.id
						live: true
						// duration: 'unkown',
					}
				];
			}
		} catch (err) {
			console.error(err);
			throw new Error("Couldn't find user or stream is offline");
		}

		// vod
		if (slugs[0] === 'videos') {
			try {
				const streamData = await twitch.getVod(slugs[1]);

				return [
					{
						title: 'Twitch vod', // streamData.at(-1).title
						id: streamData.at(-1).url,
						artist: 'unkown', // streamData.at(-1).channel.display_name
						platform: 'twitch',
						message: 'Twitch vod',
						url: args[0],
						user: 'unkown', // message.author.id
						live: false
						// duration: 'unkown',
					}
				];
			} catch (err) {
				console.error(err);
				throw new Error("Couldn't find vod");
			}

			// TODO: clips
		}

		throw new Error('Not implemented');
	},

	async getResource(song) {
		if (!song.live) {
			return createAudioResource(song.id);
		}

		// TODO: fix stream playback
		const streamData = await twitch.getStream(song.artist);
		const filtered = streamData.filter((stream) => stream.quality === 'audio_only');
		const streamLink = filtered[0].url;

		return createAudioResource(streamLink);
	}
};
