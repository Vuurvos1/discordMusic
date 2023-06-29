import { describe, it, expect } from 'vitest';
import spotify from './spotify';

describe('spotify', () => {
	it('should match twitch urls', () => {
		expect(spotify.matcher('https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ')).toBe(true);
		expect(spotify.matcher('https://open.spotify.com/artist/4tZwfgrHOc3mvqYlEYSvVi')).toBe(true);
		expect(spotify.matcher('https://open.spotify.com/track/0DiWol3AO6WpXZgp0goxAV')).toBe(true);
	});

	it('should not match non-youtube urls', () => {
		expect(spotify.matcher('google.com')).toBe(false);
		expect(spotify.matcher('www.google.com')).toBe(false);
		expect(spotify.matcher('spotify.com')).toBe(false);
		expect(spotify.matcher('www.spotify.com')).toBe(false);
	});
});
