import ytdl from 'ytdl-core';

import { MINUTES, leaveVoiceChannel, canJoinVoiceChannel } from '../utils/utils.js';
import { searchSong, searchYtSong } from '../utils/music.js';

import {
	joinVoiceChannel,
	createAudioResource,
	createAudioPlayer,
	AudioPlayerStatus
} from '@discordjs/voice';

import { EmbedBuilder } from 'discord.js';
import { queuedEmbed, defaultEmbed, errorEmbed } from '../utils/embeds.js';

import { twitchPlatform, youtubePlatform } from '../platforms/index.js';

/** @type {import('../index.js').Command} */
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

		if (!message.member) return;

		const voiceChannel = message.member.voice.channel;

		if (!voiceChannel) return;

		if (!canJoinVoiceChannel(voiceChannel, message.client.user)) {
			return message.channel.send(
				'I need the permissions to join and speak in your voice channel!'
			);
		}

		getSong(args, message, voiceChannel, client);
	},

	interaction: async (interaction, client) => {
		const songOption = interaction.options.get('song');
		if (!songOption) return;

		const song = songOption.value?.toString();
		if (!song) return;

		// if no argument is given
		if (song.trim().length < 1) {
			return interaction.reply({
				embeds: [errorEmbed('Please enter a valid argument')],
				ephemeral: true
			});
		}

		if (!interaction.member) return;

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

/** @param {import('../index').Song} song  */
async function getAudioResource(song) {
	// platforms.get(song.platform).getResource(song)
	// const platform = platforms.get(song.platform);
	// if (!platform) return; // TODO: error handling
	// return platform.getResource(song);

	if (song.platform === 'youtube') {
		return await youtubePlatform.getResource(song);
	}

	if (song.platform === 'twitch') {
		return await twitchPlatform.getResource(song);
	}

	if (song.platform === 'spotify') {
		const ytSong = await searchYtSong(`${song.title} ${song.artist}`);

		// preferibly only search youtube music/videos that are in the music categorie
		// TODO add better way to validate searched song
		if (ytSong.title.toLowerCase().includes(song.title.toLowerCase())) {
			const stream = await ytdl(`https://youtu.be/${ytSong.id}`, {
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

/**
 * @param {string[]} args
 * @param {import('discord.js').Message} message
 * @param {import('discord.js').VoiceChannel} voiceChannel
 * @param {import('discord.js').Client} client
 */
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

/**
 * @param {import('discord.js').Guild} guild
 * @param {import('../index').Song} song
 * @param {import('discord.js').Client} client
 */
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
		}, 10 * MINUTES);
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

	try {
		const audioResource = await getAudioResource(song);
		if (!audioResource) {
			throw 'No audio';
		}
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
		// console.error(error);
		// couldn't find song/problem getting audio, skip song
		guildQueue.songs.shift();
		play(guild, guildQueue.songs[0], client);
	}
}

/**
 * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} message
 * @param {string} text
 */
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

/**
 * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} message
 * @param {import('../index.js').Song} song
 */
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

/**
 * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} message
 * @param {string} error
 */
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
