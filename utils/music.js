import { URL } from 'node:url';
import { default as youtube } from 'youtube-sr';
import { demuxProbe, createAudioResource } from '@discordjs/voice';
import { errorEmbed } from './embeds.js';
import { isValidUrl } from './utils.js';

import { twitchPlatform, youtubePlatform } from '../platforms/index.js';

import SpotifyWebApi from 'spotify-web-api-node';
const { spotifyKey, spotifyClient } = process.env;

// credentials are optional
const spotifyApi = new SpotifyWebApi({
	clientId: spotifyClient,
	clientSecret: spotifyKey,
	redirectUri: 'http://www.example.com/callback'
});

/**
 * search youtube
 * @param {string} query
 * @returns {Promise<import('../index').Song>}
 */
export async function searchYtSong(query) {
	const video = await youtube.searchOne(query);

	return {
		title: video.title || 'No title',
		platform: 'youtube',
		duration: video.durationFormatted,
		id: video.id,
		url: `https://youtu.be/${video.id}`
	};
}

/**
 * @param {import('discord.js').Message} message
 * @param {string[]} args
 */
export async function getPlaylist(message, args) {
	const url = new URL(args[0]);
	const params = url.searchParams; // get url parameters
	const listId = params.get('list');

	const playlistPart = await youtube.getPlaylist(listId);
	const playlist = await playlistPart.fetch();

	if (playlist.videos.length > 0) {
		/** @type {import('../index').Songs} */
		const songs = [];
		playlist.videos.forEach((video) => {
			songs.push({
				title: video.title,
				duration: video.durationFormatted,
				id: video.id,
				url: `https://youtu.be/${video.id}`
			});
		});

		return {
			songs,
			error: false
		};
	} else {
		if (message.commandName) {
			// slash command
			message.reply({
				embeds: [errorEmbed("Couldn't find playlist")],
				ephemeral: true
			});
		} else {
			// text command
			message.channel.send({
				embeds: [errorEmbed("Couldn't find playlist")]
			});
		}

		return {
			songs: [],
			error: true
		};
	}
}

/**
 *  @param {string[]} args
 * 	@returns {Promise<import('../index').SearchSong>}
 */
export async function searchSong(args) {
	if (args.length === 1 && isValidUrl(args[0])) {
		// if url and possible special case
		const url = new URL(args[0]);

		if (youtubePlatform.matcher(url.host)) {
			try {
				return {
					message: 'Youtube stream',
					songs: (await youtubePlatform.getSong({ args })) || [],
					error: false
				};
			} catch (err) {
				return {
					message: err,
					songs: [],
					error: true
				};
			}
		}

		if (twitchPlatform.matcher(url.href)) {
			try {
				return {
					message: 'Twitch stream',
					songs: (await twitchPlatform.getSong({ args })) || [],
					error: false
				};
			} catch (err) {
				return {
					message: err,
					songs: [],
					error: true
				};
			}
		}

		// TODO: soundcloud

		if (url.host.match(/(open.spotify.com)/)) {
			// spotify through youtube (music), playlist / track
			const slugs = url.pathname.match(/[^/]+/g);

			if (slugs[0] === 'track' && slugs[1]) {
				try {
					const credentialData = await spotifyApi.clientCredentialsGrant();
					spotifyApi.setAccessToken(credentialData.body['access_token']);

					const songData = await spotifyApi.getTrack(slugs[1]);

					// look for song on youtube
					const ytSong = await searchYtSong(
						`${songData.body.name} ${songData.body.artists[0].name}`
					);

					// preferibly only search youtube music/videos that are in the music categorie
					// TODO add way to validate searched song
					if (ytSong.title?.toLocaleLowerCase().includes(songData.body.name.toLocaleLowerCase())) {
						return {
							message: '',
							songs: [ytSong],
							error: false
						};
					}

					return {
						message: "Couldn't find song",
						songs: [],
						error: true
					};
				} catch (error) {
					// console.error(error);
					return {
						message: "Couldn't find song",
						songs: [],
						error: true
					};
				}
			}

			if (slugs[0] === 'playlist' && slugs[1]) {
				// looking for playlist
				try {
					const credentialData = await spotifyApi.clientCredentialsGrant();
					spotifyApi.setAccessToken(credentialData.body['access_token']);

					// limited to 100 songs
					const playlistData = await spotifyApi.getPlaylistTracks(slugs[1], {
						offset: 0,
						fields: 'items'
					});

					// TODO: add type
					const songs = [];
					for (let i = 0; i < playlistData.body.items.length; i++) {
						const song = playlistData.body.items[i].track;

						// TODO: add proper ms to hh:mm:ss formater funciton
						songs.push({
							title: song.name,
							artist: song?.artists[0].name,
							platform: 'spotify',
							duration: new Date(song.duration_ms).toISOString().slice(11, 19),
							url: `https://open.spotify.com/track/${song.id}`
						});
					}

					return {
						message: '',
						songs: songs,
						error: false
					};
				} catch (error) {
					console.error(error);
					return {
						message: "Couldn't find playlist",
						songs: [],
						error: true
					};
				}
			}
		}
	}

	// search for video by title
	try {
		const song = await searchYtSong(args.join(' '));

		return {
			message: '',
			songs: [song],
			error: false
		};

		// added ... to the queue
	} catch (error) {
		console.error(error);
	}

	return {
		message: '',
		songs: [],
		error: true
	};
}

export async function probeAndCreateResource(readableStream) {
	const { stream, type } = await demuxProbe(readableStream);
	return createAudioResource(stream, { inputType: type });
}
