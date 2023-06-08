import { describe, it, expect } from 'vitest';
import twitch from './twitch';

describe('youtube', () => {
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

	it.concurrent('should get song data from stream', async () => {
		const songData = await twitch.getSong({
			args: ['https://www.twitch.tv/monstercat']
		});

		expect(songData).toBeInstanceOf(Array);
		expect(songData).toHaveLength(1);

		expect(songData[0]).toHaveProperty('platform', 'twitch');
		expect(songData[0]).toHaveProperty('artist', 'monstercat');
		expect(songData[0]).toHaveProperty('live', true);
	});

	it.concurrent('should get song data from vod', async () => {
		const songData = await twitch.getSong({
			args: ['https://www.twitch.tv/videos/451939071']
		});

		expect(songData).toBeInstanceOf(Array);
		expect(songData).toHaveLength(1);

		expect(songData[0]).toHaveProperty('platform', 'twitch');
		expect(songData[0]).toHaveProperty('live', false);
		expect(songData[0]).toHaveProperty('artist', 'unknown');
	});
});
