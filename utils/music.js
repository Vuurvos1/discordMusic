import { URL } from 'node:url';
import { default as youtube } from 'youtube-sr';
import { demuxProbe, createAudioResource } from '@discordjs/voice';
import { errorEmbed } from './embeds.js';
import { isValidUrl } from './utils.js';

import { spotifyPlatform, twitchPlatform, youtubePlatform } from '../platforms/index.js';

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
		/** @type {import('../index').Song[]} */
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

		if (spotifyPlatform.matcher(url.host)) {
			try {
				return {
					message: 'Spotify stream',
					songs: (await spotifyPlatform.getSong({ args })) || [],
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
