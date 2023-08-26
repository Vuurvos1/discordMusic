import { describe, it, expect } from 'vitest';
import youtube from './youtube';

describe('youtube', () => {
	it('should match youtube urls', () => {
		expect(youtube.matcher('youtube.com')).toBe(true);
		expect(youtube.matcher('www.youtube.com')).toBe(true);
		expect(youtube.matcher('youtu.be')).toBe(true);
		expect(youtube.matcher('www.youtu.be')).toBe(true);
		expect(youtube.matcher('music.youtube.com')).toBe(true);
		expect(youtube.matcher('www.music.youtube.com')).toBe(true);
		expect(youtube.matcher('m.youtube.com')).toBe(true);
	});

	it('should not match non-youtube urls', () => {
		expect(youtube.matcher('google.com')).toBe(false);
		expect(youtube.matcher('www.google.com')).toBe(false);
		expect(youtube.matcher('spotify.com')).toBe(false);
		expect(youtube.matcher('www.spotify.com')).toBe(false);
	});

	it('should get resource', async () => {});

	it.concurrent('should get song data from playlist', async () => {
		const songData = await youtube.getSong({
			args: ['https://www.youtube.com/watch?v=Iczqotmm5sk&list=PLwVziAzt2oDIEg3jRtJDFq22HVaj8PgkE']
		});

		expect(songData).toBeInstanceOf(Array);
		expect(songData?.length).toBeGreaterThan(1);

		expect(songData.every((song) => song.platform === 'youtube')).toBe(true);
	});

	it.concurrent('should get song data from stream', async () => {
		const songData = await youtube.getSong({
			args: ['https://www.youtube.com/watch?v=5qap5aO4i9A']
		});

		expect(songData).toBeInstanceOf(Array);

		expect(songData).toHaveLength(1);

		expect(songData[0]).toHaveProperty('platform', 'youtube');
		expect(songData[0]).toHaveProperty('live', true);
		expect(songData[0]).toHaveProperty('artist', 'Lofi Girl');
	});

	it.concurrent('should get song data from search', async () => {
		const songData = await youtube.getSong({
			args: ['lofi']
		});

		expect(songData).toBeInstanceOf(Array);
		expect(songData).toHaveLength(1);
		expect(songData[0]).toHaveProperty('platform', 'youtube');
	});
});
