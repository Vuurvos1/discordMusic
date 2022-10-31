import { TextChannel, VoiceChannel, Message, Interaction } from 'discord.js';
import { AudioPlayer } from '@discordjs/voice';

// server queue, rename to servers?
export type guildQueueItem = {
	textChannel: TextChannel | null; // remove null?
	voiceChannel: VoiceChannel | null; // remove null?
	songMessage: Message | null;
	connection: null; // get actual type from discord.js
	player: AudioPlayer | null; // remove null?
	songs: Songs; // create song type
	volume: 5;
	playing: false;
	paused: false;
	looping: false;
};

export type command = {
	name: string;
	description: string;
	alias: string[];
	interactionOptions: [];
	permissions: { memberInVoice?: false };
	command: function; // Message, string[], discord client
	interaction: function; // Interaction, discord client
};

// song might not be the best name, maybe change to "Audio"
export type Song = {
	title: string;
	platform: 'search' | 'youtube' | 'twitch' | 'spotify' | 'soundcloud';
	duration: string;
	url: string;
	id?: string;
	user: string; // discord js user
	message: strign;
};

export type Songs = Song[];
