import type {
	TextChannel,
	Channel,
	VoiceChannel,
	VoiceState,
	Message,
	Interaction,
	Client,
	ChatInputCommandInteraction,
	VoiceBasedChannel
} from 'discord.js';
import type { AudioPlayer, AudioResource, VoiceConnection } from '@discordjs/voice';

export type GuildQueue = Map<string, GuildQueueItem>;

export type GuildMemberWithVoice = GuildMember & { voice: VoiceState };

// server queue, rename to servers?
export type GuildQueueItem = {
	id: string;
	textChannel: Channel | null;
	voiceChannel: VoiceChannel | VoiceBasedChannel | null;
	songMessage: Message | null;
	connection: VoiceConnection | null;
	audioPlayer: AudioPlayer | null; // rename to player?
	songs: Song[]; // create song type
	volume: 5;
	paused: boolean;
	looping: boolean;
};

export type Command = {
	name: string;
	description: string;
	aliases: string[];
	interactionOptions?: any[]; // TODO: add better typing
	permissions: { memberInVoice?: boolean };
	command: (params: {
		message: Message;
		args: string[];
		client: Client;
		server: GuildQueueItem | undefined; // TODO: remove undefined?
	}) => any; // Message, string[], discord client
	interaction: (params: {
		interaction: Interaction;
		client: Client;
		server: GuildQueueItem | undefined; // TODO: remove undefined?
	}) => any; // Interaction, discord client
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
		client?: Client;
	}) => Promise<Song[] | null>; // string, discord client, // TODO: remove null // Rename to getAudio?
	getResource: (song: Song) => Promise<AudioResource | undefined>; // string, discord client // Rename to getAudioResource?
};
