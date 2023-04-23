import { createAudioResource } from '@discordjs/voice';
// import SpotifyWebApi from 'spotify-web-api-node';
// const { spotifyKey, spotifyClient } = process.env;

/** @type {import('../index.js').PlatformInterface} */
export default {
	name: 'spotify',
	matcher(string) {
		return /(open.spotify.com)/.test(string);
	},
	getSong() {
		// 	const ytSong = await searchYtSong(`${song.title} ${song.artist}`);

		// 	// preferibly only search youtube music/videos that are in the music categorie
		// 	// TODO add better way to validate searched song
		// 	if (ytSong.title.toLowerCase().includes(song.title.toLowerCase()))

		throw new Error('Not implemented');

		// return null;
	},
	getResource() {
		// if (song.platform === 'spotify') {
		// 	const ytSong = await searchYtSong(`${song.title} ${song.artist}`);

		// 	// preferibly only search youtube music/videos that are in the music categorie
		// 	// TODO add better way to validate searched song
		// 	if (ytSong.title.toLowerCase().includes(song.title.toLowerCase())) {
		// 		const stream = await ytdl(`https://youtu.be/${ytSong.id}`, {
		// 			filter: 'audioonly',
		// 			quality: 'highestaudio',
		// 			highWaterMark: 1 << 25
		// 		});

		// 		return createAudioResource(stream);
		// 	} else {
		// 		return undefined;
		// 	}
		// }

		return createAudioResource('');
	}
};
