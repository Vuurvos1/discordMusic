import { createAudioResource } from '@discordjs/voice';

import ytdl from 'ytdl-core';
import { default as youtube } from 'youtube-sr';

import SpotifyWebApi from 'spotify-web-api-node';
const { spotifyKey, spotifyClient } = process.env;

// credentials are optional
const spotifyApi = new SpotifyWebApi({
	clientId: spotifyClient,
	clientSecret: spotifyKey,
	redirectUri: 'http://www.example.com/callback'
});

/** @type {import('../index.js').PlatformInterface} */
export default {
	name: 'spotify',
	matcher(string) {
		return /(open.spotify.com)/.test(string);
	},
	async getSong({ args }) {
		// spotify through youtube (music), playlist / track

		const url = new URL(args[0]);

		const slugs = url.pathname.match(/[^/]+/g);

		if (!slugs) throw new Error('Invalid url');

		// preferibly only search youtube music/videos that are in the music categorie
		if (slugs[0] === 'track' && slugs[1]) {
			try {
				const credentialData = await spotifyApi.clientCredentialsGrant();
				spotifyApi.setAccessToken(credentialData.body['access_token']);
				const songData = await spotifyApi.getTrack(slugs[1]);

				// look for song on youtube
				const video = await youtube.searchOne(
					`${songData.body.name} ${songData.body.artists[0].name}`
				);

				/** @type {import('../index').Song} */
				const song = {
					title: video.title || 'unkown',
					id: video.id,
					artist: 'unkown',
					platform: 'spotify',
					message: 'Spotify song',
					user: 'unkown',
					duration: video.durationFormatted,
					url: url.href,
					live: false
					// user: message.author.id
				};
				// 			// preferibly only search youtube music/videos that are in the music categorie
				// 			// TODO add way to validate searched song
				if (song.title?.toLocaleLowerCase().includes(songData.body.name.toLocaleLowerCase())) {
					return [song];
				}

				throw new Error("Couldn't find song");
			} catch (error) {
				throw new Error("Couldn't find song");
			}
		}

		// looking for playlist
		if (slugs[0] === 'playlist' && slugs[1]) {
			try {
				// do I need to do this every time?
				const credentialData = await spotifyApi.clientCredentialsGrant();
				spotifyApi.setAccessToken(credentialData.body['access_token']);
				// limited to 100 songs
				const playlistData = await spotifyApi.getPlaylistTracks(slugs[1], {
					offset: 0,
					fields: 'items'
				});

				/** @type {import('../index').Song[]} */
				const songs = [];
				for (let i = 0; i < playlistData.body.items.length; i++) {
					const song = playlistData.body.items[i].track;

					if (!song) continue;
					// TODO: add proper ms to hh:mm:ss formater funciton
					songs.push({
						title: song.name,
						artist: song?.artists[0].name, // consider adding all artists
						platform: 'spotify',
						user: 'unkown',
						message: 'Spotify song',
						duration: new Date(song.duration_ms).toISOString().slice(11, 19),
						url: `https://open.spotify.com/track/${song.id}`,
						live: false
					});
				}
				return songs;
			} catch (error) {
				console.error(error);
				throw new Error("Couldn't find playlist");
			}
		}

		throw new Error('Invalid url');
	},
	async getResource(song) {
		const video = await youtube.searchOne(`${song.artist} ${song.title}`);

		if (!video.title) return undefined; // change to a throw?

		// TODO add better way to validate searched song
		if (video.title.toLowerCase().includes(song.title.toLowerCase())) {
			const stream = await ytdl(`https://youtu.be/${video.id}`, {
				filter: 'audioonly',
				quality: 'highestaudio',
				highWaterMark: 1 << 25
			});

			return createAudioResource(stream);
		}

		return undefined; // change to a throw?
	}
};

// get spotify track function