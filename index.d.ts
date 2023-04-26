import type {
	TextChannel,
	VoiceChannel,
	Message,
	Interaction,
	Client,
	ChatInputCommandInteraction
} from 'discord.js';
import type { AudioPlayer, AudioResource, VoiceConnection } from '@discordjs/voice';

type CustomClient = Client & { queue: Map<string, GuildQueueItem> };

// server queue, rename to servers?
export type GuildQueueItem = {
	textChannel: TextChannel | null; // remove null?
	voiceChannel: VoiceChannel | null; // remove null?
	songMessage: Message | null;
	connection: VoiceConnection; // get actual type from discord.js
	audioPlayer: AudioPlayer | null; // remove null? rename to player?
	songs: Song[]; // create song type
	volume: 5;
	playing: false; // not sure if this is needed, because paused is already there
	paused: boolean;
	looping: boolean;
};

export type Command = {
	name: string;
	description: string;
	aliases: string[];
	interactionOptions?: any[]; // TODO: add better typing
	interactionOptions?: any[]; // TODO: add better typing
	permissions: { memberInVoice?: boolean };
	command: (message: Message, args: string[], client: CustomClient) => any; // Message, string[], discord client // Change to take a params object?
	interaction: (interaction: ChatInputCommandInteraction, client: CustomClient) => any; // Interaction, discord client
};

export type SearchSong = {
	message: string;
	songs: Song[];
	error?: boolean;
};

// song might not be the best name, maybe change to "Audio"
export type Song = {
	title: string;
	artist: string;
	url: string;
	id?: string;
	live?: boolean;
	platform: 'search' | 'youtube' | 'twitch' | 'spotify' | 'soundcloud';
	duration?: string;
	user: string; // discord js user
	message: string;
};

export type PlatformInterface = {
	name: string;
	matcher: (string: string) => boolean;
	getSong: (params: {
		message?: Message;
		args: string[];
		client?: CustomClient;
	}) => Promise<Song[] | null>; // string, discord client, // TODO: remove null // Rename to getAudio?
	getResource: (song: Song) => Promise<AudioResource | undefined>; // string, discord client // Rename to getAudioResource?
};
