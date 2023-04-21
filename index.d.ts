import type {
	TextChannel,
	VoiceChannel,
	Message,
	Interaction,
	Client,
	ChatInputCommandInteraction
} from 'discord.js';
import type { AudioPlayer, VoiceConnection } from '@discordjs/voice';

type CustomClient = Client & { queue: Map<string, GuildQueueItem> };

// server queue, rename to servers?
export type GuildQueueItem = {
	textChannel: TextChannel | null; // remove null?
	voiceChannel: VoiceChannel | null; // remove null?
	songMessage: Message | null;
	connection: VoiceConnection; // get actual type from discord.js
	player: AudioPlayer | null; // remove null?
	songs: Song[]; // create song type
	volume: 5;
	playing: false;
	paused: false;
	looping: false;
};

export type Command = {
	name: string;
	description: string;
	aliases: string[];
	interactionOptions?: [];
	permissions: { memberInVoice?: boolean };
	command: (message: Message, args: string[], client: CustomClient) => any; // Message, string[], discord client
	interaction: (interaction: ChatInputCommandInteraction, client: CustomClient) => any; // Interaction, discord client
};

export type SearchSong = {
	message: string;
	songs: Song[];
	error: bool;
};

// song might not be the best name, maybe change to "Audio"
export type Song = {
	title: string;
	artist: string;
	url: string;
	id?: string;
	platform: 'search' | 'youtube' | 'twitch' | 'spotify' | 'soundcloud';
	duration: string;
	user: string; // discord js user
	message: string;
};

export type PlatformInterface = {
	name: string;
	search: function; // string, discord client
	getSong: function; // string, discord client
};
