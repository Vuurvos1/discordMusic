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

	it.skip('should get resource', async () => {});

	it.concurrent('should get song data from video', async () => {
		const data = await youtube.getAudio({
			args: ['https://www.youtube.com/watch?v=Iczqotmm5sk']
		});

		expect(data.data).toBeInstanceOf(Array);
		expect(data.data).toHaveLength(1);

		const song = data.data?.at(0);
		expect(song).toHaveProperty('platform', 'youtube');
		expect(song).toHaveProperty('live', false);
	});

	it.concurrent('should get song data from playlist', async () => {
		const data = await youtube.getAudio({
			args: ['https://www.youtube.com/watch?v=Iczqotmm5sk&list=PLwVziAzt2oDIEg3jRtJDFq22HVaj8PgkE']
		});

		expect(data.data).toBeInstanceOf(Array);
		expect(data.data?.length).toBeGreaterThan(1);
		expect(data.data?.every((song) => song.platform === 'youtube')).toBe(true);
	});

	it.concurrent('should get song data from stream', async () => {
		const data = await youtube.getAudio({
			args: ['https://www.youtube.com/watch?v=5qap5aO4i9A']
		});

		expect(data.data).toBeInstanceOf(Array);
		expect(data.data).toHaveLength(1);

		const song = data.data?.at(0);
		expect(song).toHaveProperty('platform', 'youtube');
		expect(song).toHaveProperty('live', true);
		expect(song).toHaveProperty('artist', 'Lofi Girl');
	});

	it.concurrent('should get song data from search', async () => {
		const data = await youtube.getAudio({
			args: ['lofi']
		});

		expect(data.data).toBeInstanceOf(Array);
		expect(data.data).toHaveLength(1);

		const song = data.data?.at(0);
		expect(song).toHaveProperty('platform', 'youtube');
	});

	it.concurrent('should error on private playlist url', async () => {
		const data = await youtube.getAudio({
			args: ['https://www.youtube.com/playlist?list=WL']
		});

		expect(data.error).toBeTypeOf('string');
	});

	it.concurrent('should error on non existent video', async () => {
		const data = await youtube.getAudio({
			args: ['https://www.youtube.com/watch?v=aaa']
		});

		expect(data.error).toBeTypeOf('string');
	});
});
