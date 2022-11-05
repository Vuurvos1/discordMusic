import { URL } from 'node:url';
import { default as youtube } from 'youtube-sr';
import { demuxProbe, createAudioResource } from '@discordjs/voice';
import { errorEmbed } from './embeds.js';
import { isValidUrl } from './utils.js';

import twitch from 'twitch-m3u8';
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
		title: video.title,
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

		if (
			url.host.match(
				/(www.youtube.com|youtube.com|www.youtu.be|youtu.be.be|www.music.youtube.com|music.youtube.com|m.youtube.com)/
			)
		) {
			// youtube, video, music / playlist, live / shorts, m.youtube, short/share link

			// playlist
			if (url.searchParams.has('list')) {
				try {
					const playlist = await youtube.getPlaylist(args[0], { fetchAll: true });

					/** @type {import('../index').Songs} */
					const songs = [];
					playlist.videos.forEach((video) => {
						// TODO: test for unlisted/private?
						// This could be slow creating a bunch of new objects
						songs.push({
							title: video.title,
							platform: 'youtube',
							duration: video.durationFormatted,
							id: video.id,
							url: `https://youtu.be/${video.id}`,
							live: video.live
						});
					});

					return {
						message: `Queued **${songs.length}** songs`,
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

			// TODO: fix stream

			// normal video
			try {
				const songData = await youtube.getVideo(args[0]);

				const song = {
					title: songData.title,
					platform: 'youtube',
					duration: songData.durationFormatted,
					id: songData.id,
					url: `https://youtu.be/${songData.id}`,
					live: songData.live
				};

				return {
					message: `Queued ${song.title}`,
					songs: [song],
					error: false
				};
			} catch (error) {
				return {
					message: "Couldn't find song",
					songs: [],
					error: true
				};
			}
		}

		if (url.host.match(/(www.twitch.tv|twitch.tv)/)) {
			const slugs = url.pathname.match(/[^/]+/g);

			// live/user
			if (slugs.length === 1) {
				// try catch for offline streams
				try {
					const streamData = await twitch.getStream(slugs[0]);
					return {
						message: 'Twitch stream',
						songs: [
							{
								title: slugs[0],
								platform: 'twitch',
								url: args[0],
								id: streamData.at(-1).url
							}
						]
					};
				} catch (error) {
					return {
						message: "Couldn't find user or stream is offline",
						songs: [],
						error: true
					};
				}
			}

			// vod
			if (slugs[0] === 'videos') {
				try {
					const streamData = await twitch.getVod(slugs[1]);

					return {
						message: 'Twitch VOD',
						songs: [
							{
								title: slugs[1],
								platform: 'twitch',
								url: args[0],
								id: streamData.at(-1).url
							}
						]
					};
				} catch (error) {
					console.error(error);
					return {
						message: "Couldn't find vod",
						songs: [],
						error: true
					};
				}
			}

			// clips
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
