import { URL } from 'node:url';

import ytdl from 'ytdl-core';
import twitch from 'twitch-m3u8';
import { default as youtube } from 'youtube-sr';

import spotifyWebApi from 'spotify-web-api-node';
const { spotifyKey, spotifyClient } = process.env;

import { MINUTES, leaveVoiceChannel, canJoinVoiceChannel, isValidUrl } from '../utils/utils.js';
// import { getSong, getPlaylist } from '../utils/music.js';

import {
	joinVoiceChannel,
	createAudioResource,
	createAudioPlayer,
	AudioPlayerStatus
} from '@discordjs/voice';

import { EmbedBuilder } from 'discord.js';
import { queuedEmbed, defaultEmbed, errorEmbed } from '../utils/embeds.js';
import { demuxProbe } from '@discordjs/voice';

// // credentials are optional
const spotifyApi = new spotifyWebApi({
	clientId: spotifyClient,
	clientSecret: spotifyKey,
	redirectUri: 'http://www.example.com/callback'
});

export default {
	name: 'play',
	description: 'Play a song',
	aliases: ['p', 'sr'],
	interactionOptions: [
		{
			name: 'song',
			description: 'song name or url',
			type: 3, // type STRING
			required: true
		}
	],
	permissions: {
		memberInVoice: true
	},

	command: async (message, args, client) => {
		// if no argument is given
		if (args.length < 1) {
			return message.channel.send('Please enter a valid url');
		}

		const voiceChannel = message.member.voice.channel;
		if (!canJoinVoiceChannel(voiceChannel, message.client.user)) {
			return message.channel.send(
				'I need the permissions to join and speak in your voice channel!'
			);
		}

		getSong(args, message, voiceChannel, client);
	},

	interaction: async (interaction, client) => {
		const song = interaction.options.get('song').value;

		// if no argument is given
		if (song.trim().length < 1) {
			return interaction.reply({
				embeds: [errorEmbed('Please enter a valid argument')],
				ephemeral: true
			});
		}

		const voiceChannel = interaction.member.voice.channel;
		if (!canJoinVoiceChannel(voiceChannel, interaction.client.user)) {
			return interaction.reply({
				embeds: [errorEmbed('I need the permissions to join and speak in your voice channel!')],
				ephemeral: true
			});
		}

		getSong([song], interaction, voiceChannel, client);
	}
};

// /** @param {import('../index').Song} songData  */
// async function playSong(songData) {
// 	// handle vc and connection logic
// 	// actually fetches the stream to play, call getAudioResource
// 	// play the audio
// }

async function getAudioResource(song) {
	console.log(song);

	if (song.platform === 'youtube') {
		const stream = await ytdl(song.url, {
			filter: 'audioonly',
			quality: 'highestaudio',
			highWaterMark: 1 << 25
		});

		return createAudioResource(stream);
	}

	if (song.platform === 'twitch') {
		// try {
		const streamLink = await twitch.getStream(song.title).then((data) => {
			return data.at(-1).url;
		});
		return createAudioResource(streamLink);
		// } catch (error) {
		// 	console.error(error);
		// }
	}

	if (song.platform === 'spotify') {
		// lookup song

		// look for song on youtube
		const video = await youtube.searchOne(song.title);

		// preferibly only search youtube music/videos that are in the music categorie
		// TODO add way to validate searched song
		if (video?.title.toLowerCase().includes(song.title.toLowerCase())) {
			console.log(video);

			const stream = await ytdl(`https://youtu.be/${video.id}`, {
				filter: 'audioonly',
				quality: 'highestaudio',
				highWaterMark: 1 << 25
			});

			return createAudioResource(stream);
		} else {
			return undefined;
		}
	}
}

/** @param {string[]} args  */
async function searchSong(args) {
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
							url: `https://youtu.be/${video.id}`
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
					url: `https://youtu.be/${songData.id}`
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
			// console.log('spotify match');
			// spotify through youtube (music)
			// playlist / track

			const slugs = url.pathname.match(/[^/]+/g);

			if (slugs[0] === 'track' && slugs[1]) {
				try {
					const credentialData = await spotifyApi.clientCredentialsGrant();
					spotifyApi.setAccessToken(credentialData.body['access_token']);

					const songData = await spotifyApi.getTrack(slugs[1]);

					// look for song on youtube
					const video = await youtube.searchOne(songData.body.name + songData.body.artists[0].name);

					// preferibly only search youtube music/videos that are in the music categorie
					// TODO add way to validate searched song
					// console.log(video);

					if (video.title?.includes(songData.body.name)) {
						const song = {
							title: video.title,
							platform: 'youtube',
							duration: video.durationFormatted,
							id: video.id,
							url: `https://youtu.be/${video.id}`
						};

						return {
							message: '',
							songs: [song],
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

	// search youtube
	const searchString = args.join(' ');

	// search for video by title
	try {
		const video = await youtube.searchOne(searchString);

		const song = {
			title: video.title,
			platform: 'youtube',
			duration: video.durationFormatted,
			id: video.id,
			url: `https://youtu.be/${video.id}`
		};

		return {
			message: '',
			songs: [song],
			error: false
		};

		// added ... to the queue
	} catch (error) {
		console.error(error);
	}
}

async function getSong(args, message, voiceChannel, client) {
	// guildqueue creation logic
	// TODO split
	let guildQueue = client.queue.get(message.guild.id);

	if (!guildQueue) {
		const queueContruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			songMessage: null,
			connection: null,
			audioPlayer: null,
			songs: [],
			volume: 5,
			playing: false,
			paused: false,
			looping: false
		};

		client.queue.set(message.guild.id, queueContruct);
		guildQueue = client.queue.get(message.guild.id);
	}

	guildQueue.textChannel = message.channel; // updated each time a song is added

	// get song data
	const songsData = await searchSong(args);

	if (songsData.error) {
		sendErrorMessage(message, songsData.message);
		// send error message
		return;
	}

	// send message
	if (songsData.songs.length > 1) {
		sendDefaultMessage(message, `Queued **${songsData.songs.length}** songs`);
	} else {
		sendQueueMessage(message, songsData.songs[0]);
	}

	// add songs to queue
	guildQueue.songs.push(...songsData.songs);

	// join vc logic
	try {
		const connection = joinVoiceChannel({
			channelId: message.member.voice.channel.id,
			guildId: message.guild.id,
			adapterCreator: message.guild.voiceAdapterCreator
		});

		guildQueue.connection = connection;

		if (!guildQueue.playing) {
			// play song
			guildQueue.playing = true;
			play(message.guild, guildQueue.songs[0], client);
		}
	} catch (error) {
		console.error(error);
		client.queue.delete(message.guild.id);
		return message.channel.send(error);
	}
}

async function play(guild, song, client) {
	const queue = client.queue;
	const guildQueue = queue.get(guild.id);

	if (!song) {
		if (guildQueue.songMessage) {
			guildQueue.songMessage.delete();
			guildQueue.songMessage = undefined;
		}

		guildQueue.playing = false;

		setTimeout(() => {
			// if still no songs in queue
			if (guildQueue.songs.length < 1) {
				// leave voice channel
				if (guildQueue.textChannel) {
					// TODO bug send not a function?
					guildQueue.textChannel.send('No more songs to play');
				}
				leaveVoiceChannel(queue, guild.id);
			}
		}, 5 * MINUTES);
		return;
	}

	if (!guildQueue.audioPlayer) {
		guildQueue.audioPlayer = createAudioPlayer();

		// once song finished playing, play next song in queue
		guildQueue.audioPlayer.on(AudioPlayerStatus.Idle, () => {
			guildQueue.songs.shift();
			play(guild, guildQueue.songs[0], client);
		});

		guildQueue.audioPlayer.on('error', (error) => {
			console.error(error);
			// play next song
			guildQueue.songs.shift();
			play(guild, guildQueue.songs[0], client);
		});

		guildQueue.connection.subscribe(guildQueue.audioPlayer);
	}

	// const audioResource = await probeAndCreateResource(info);
	// const audioResource = createAudioResource(streamLink);

	try {
		const audioResource = await getAudioResource(song);
		// if (!audioResource) { }
		guildQueue.audioPlayer.play(audioResource);

		const embed = new EmbedBuilder()
			.setTitle('Now Playing')
			.setDescription(
				`[${song.title.length > 60 ? song.title.substring(0, 60 - 1) + '…' : song.title}](${
					song.url
				})`
			);

		// delete old song message
		if (guildQueue.songMessage) {
			await guildQueue.songMessage.delete();
		}

		// TODO bug send not a function?
		if (guildQueue.textChannel) {
			guildQueue.songMessage = await guildQueue.textChannel.send({
				embeds: [embed]
			});
		}
	} catch (error) {
		console.error(error);
		// skip song
	}
}

async function probeAndCreateResource(readableStream) {
	const { stream, type } = await demuxProbe(readableStream);
	return createAudioResource(stream, { inputType: type });
}

function sendDefaultMessage(message, text) {
	if (message.commandName) {
		// slash command
		message.reply({
			embeds: [defaultEmbed(text)],
			ephemeral: false
		});
	} else {
		// text command
		message.channel.send({
			embeds: [defaultEmbed(text)]
		});
	}
}

function sendQueueMessage(message, song) {
	if (message.commandName) {
		// slash command
		message.reply({
			embeds: [queuedEmbed(message, song)],
			ephemeral: false
		});
	} else {
		// text command
		message.channel.send({ embeds: [queuedEmbed(message, song)] });
	}
}

function sendErrorMessage(message, error) {
	if (message.commandName) {
		// slash command
		message.reply({
			embeds: [queuedEmbed(message, errorEmbed(error))],
			ephemeral: false
		});
	} else {
		// text command
		message.channel.send({ embeds: [errorEmbed(error)] });
	}
}

// const stream = ytdl(song.url, {
//   dlChunkSize: 0,
//   isHLS: true,
// });
// console.log(info);
// const format = ytdl.chooseFormat(info.formats, {
//   isHLS: true,
// });

// if (song.duration === '0:00') {
//   // is stream
//   console.log('stream');
//   stream = ytdl(song.url, {
//     highWaterMark: 1 << 25,
//     dlChunkSize: 0,
//     isHLS: true,
//   });
// } else {
//   // not a stream
//   stream = ytdl(song.url, {
//     filter: 'audioonly',
//     quality: 'highestaudio',
//     highWaterMark: 1 << 25,
//   });
// }
