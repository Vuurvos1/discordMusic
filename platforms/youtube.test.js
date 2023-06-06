import { describe, it, expect } from 'vitest';
import youtube from './youtube';

describe('', () => {
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
});
