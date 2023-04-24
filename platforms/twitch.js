import { createAudioResource } from '@discordjs/voice';
import twitch from 'twitch-m3u8';

/** @type {import('../index.js').PlatformInterface} */
export default {
	name: 'twitch',
	matcher(string) {
		return /https?:\/\/(www\.)?twitch\.tv\/.+/.test(string);
	},

	async getSong({ args }) {
		const url = new URL(args[0]);
		console.log(url);

		const slugs = url.pathname.match(/[^/]+/g); // get url slugs, by splitting the pathname by /

		if (!slugs) return null; // please enter a valid url

		// TODO: add twitch meta data

		// live/user
		try {
			if (slugs.length === 1) {
				const streamData = await twitch.getStream(slugs[0]);
				return [
					{
						title: 'Twitch stream',
						// title: streamData.at(-1).title,
						id: streamData.at(-1).url,
						artist: url.pathname.split('/')[1],
						platform: 'twitch',
						message: 'Twitch stream',
						url: args[0],
						// user: message.author.id
						user: 'unkown'
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

				console.log('stream vod');

				return [
					{
						title: 'Twitch vod',
						// title: streamData.at(-1).title,
						id: streamData.at(-1).url,
						artist: 'unkown',
						// artist: streamData.at(-1).channel.display_name,
						platform: 'twitch',
						message: 'Twitch vod',
						url: args[0],
						user: 'unkown'
						// user: message.author.id
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
		const streamLink = await twitch.getStream(song.title).then((data) => {
			return data.at(-1).url;
		});

		return createAudioResource(streamLink);
	}
};
