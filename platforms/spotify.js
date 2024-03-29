import { createAudioResource } from '@discordjs/voice';
import { formatTimestamp } from '../utils/utils.js';
import play from 'play-dl';
import SpotifyWebApi from 'spotify-web-api-node';

const { SPOTIFY_KEY, SPOTIFY_CLIENT } = process.env;

// credentials are optional
const spotifyApi = new SpotifyWebApi({
	clientId: SPOTIFY_CLIENT,
	clientSecret: SPOTIFY_KEY,
	redirectUri: 'http://www.example.com/callback'
});

/** @type {import('../').PlatformInterface} */
export default {
	name: 'spotify',
	matcher(string) {
		return /(open.spotify.com)/.test(string);
	},
	async getAudio({ args }) {
		// spotify through youtube (music), playlist / track
		if (!spotifyApi || !SPOTIFY_KEY) {
			return {
				data: [],
				error: 'Spotify not configured'
			};
		}

		const url = new URL(args[0]);
		const slugs = url.pathname.match(/[^/]+/g);

		if (!slugs) return { data: [], error: 'Invalid url' };

		// preferibly only search youtube music/videos that are in the music categorie
		if (slugs[0] === 'track' && slugs[1]) {
			try {
				const credentialData = await spotifyApi.clientCredentialsGrant();
				spotifyApi.setAccessToken(credentialData.body['access_token']);
				const songData = await spotifyApi.getTrack(slugs[1]);

				if (!songData || songData.statusCode !== 200) {
					return { data: [], error: "Couldn't find song" };
				}

				const { body } = songData;

				/** @type {import('../').Song} */
				const song = {
					title: body.name || 'unknown',
					id: body.id || 'unknown',
					artist: body.artists[0].name || 'unknown',
					platform: 'spotify',
					message: 'Spotify song',
					user: 'unknown',
					duration: formatTimestamp(body.duration_ms),
					url: url.href,
					live: false
					// user: message.author.id
				};

				// preferibly only search youtube music/videos that are in the music categorie
				// TODO add way to validate searched song
				if (song.title?.toLocaleLowerCase().includes(songData.body.name.toLocaleLowerCase())) {
					return { data: [song] };
				}

				return {
					data: [],
					error: "Couldn't find song"
				};
			} catch (error) {
				return {
					data: [],
					error: "Couldn't find song"
				};
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

				/** @type {import('../').Song[]} */
				const songs = [];
				for (let i = 0; i < playlistData.body.items.length; i++) {
					const song = playlistData.body.items[i].track;

					if (!song) continue;
					// TODO: add proper ms to hh:mm:ss formater funciton
					songs.push({
						title: song.name,
						id: '',
						artist: song?.artists[0].name, // consider adding all artists
						platform: 'spotify',
						user: 'unknown',
						message: 'Spotify song',
						duration: new Date(song.duration_ms).toISOString().slice(11, 19),
						url: `https://open.spotify.com/track/${song.id}`,
						live: false
					});
				}
				return { data: songs };
			} catch (error) {
				console.error(error);
				return {
					data: [],
					error: "Couldn't find playlist"
				};
			}
		}

		return {
			data: [],
			error: "Couldn't find playlist"
		};
	},
	async getResource(song) {
		const yt_info = await play.search(`${song.title} ${song.artist}`, {
			limit: 1
		});

		if (!yt_info[0]) return undefined;

		const video = yt_info[0];

		if (!video.title) return undefined;

		// TODO add better way to validate searched song
		if (video.title.toLowerCase().includes(song.title.toLowerCase())) {
			const stream = await play.stream(video.url);

			const resource = createAudioResource(stream.stream, {
				inputType: stream.type
			});

			return resource;
		}

		return undefined; // TODO: change to a throw?
	}
};

// get spotify track function
