import { default as twitchPlatform } from './twitch.js';
import { default as youtubePlatform } from './youtube.js';
import { default as spotifyPlatform } from './spotify.js';

export const platforms = new Map(
	/** @type {const} */ Object.entries({
		twitch: twitchPlatform,
		youtube: youtubePlatform,
		spotify: spotifyPlatform
	})
);
