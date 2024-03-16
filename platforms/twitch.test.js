import { describe, it, expect } from 'vitest';
import twitch from './twitch';

describe('twitch', () => {
	it('should match twitch urls', () => {
		expect(twitch.matcher('twitch.tv')).toBe(true);
		expect(twitch.matcher('https://www.twitch.tv/monstercat')).toBe(true);
	});

	it('should not match non-twitch urls', () => {
		expect(twitch.matcher('google.com')).toBe(false);
		expect(twitch.matcher('www.google.com')).toBe(false);
		expect(twitch.matcher('spotify.com')).toBe(false);
		expect(twitch.matcher('www.spotify.com')).toBe(false);
	});

	it('should get resource', async () => {});

	it.concurrent('should get song data from stream', async ({ skip }) => {
		const data = await twitch.getAudio({
			args: ['https://www.twitch.tv/monstercat']
		});

		if (data.data.length === 0) {
			skip();
		}

		expect(data.data).toBeInstanceOf(Array);
		expect(data.data).toHaveLength(1);

		const song = data.data.at(0);

		expect(song).toHaveProperty('platform', 'twitch');
		expect(song).toHaveProperty('artist', 'monstercat');
		expect(song).toHaveProperty('live', true);
	});

	it.concurrent('should get song data from vod', async () => {
		const data = await twitch.getAudio({
			args: ['https://www.twitch.tv/videos/451939071']
		});

		expect(data.data).toBeInstanceOf(Array);
		expect(data.data).toHaveLength(1);

		const song = data.data.at(0);
		expect(song).toHaveProperty('platform', 'twitch');
		expect(song).toHaveProperty('live', false);
		expect(song).toHaveProperty('artist', 'unknown');
	});

	// TODO: test for non-existent vods and streams
});
