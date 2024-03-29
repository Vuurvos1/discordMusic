import type {
	TextChannel,
	Channel,
	VoiceChannel,
	VoiceState,
	Message,
	Interaction,
	Client,
	ChatInputCommandInteraction,
	VoiceBasedChannel,
	SlashCommandBuilder,
	ApplicationCommandDataResolvable,
	TextBasedChannel
} from 'discord.js';
import type { AudioPlayer, AudioResource, VoiceConnection } from '@discordjs/voice';

export type GuildQueue = Map<string, GuildQueueItem>;

export type GuildMemberWithVoice = GuildMember & { voice: VoiceState };

// server queue, rename to servers?
export type GuildQueueItem = {
	id: string;
	textChannel: TextChannel | TextBasedChannel | null;
	voiceChannel: VoiceChannel | VoiceBasedChannel | null;
	songMessage: Message | null;
	connection: VoiceConnection | null;
	audioPlayer: AudioPlayer | null; // rename to player?
	songs: Song[];
	volume: number; // not used
	paused: boolean;
	looping: boolean;
};

export type Command = {
	name: string;
	description: string;
	interactionOptions?: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>; // TODO: unsure if this is the correct type
	permissions?: { memberInVoice?: boolean }; // TODO: change to a boolean array?
	interaction: (params: {
		interaction: ChatInputCommandInteraction;
		server: GuildQueueItem | undefined;
	}) => any; // Interaction, discord client
};

export type SearchSong = {
	message: string;
	songs: Song[];
	error?: boolean;
};

// TODO: change platform to enum?

// song might not be the best name, maybe change to "Audio"
export type Song = {
	title: string;
	artist: string;
	url: string;
	id: string;
	live: boolean;
	platform: 'search' | 'youtube' | 'twitch' | 'spotify' | 'soundcloud';
	duration?: string;
	user: string; // discord js user
	message: string;
};

export type PlatformInterface = {
	name: string;
	matcher: (string: string) => boolean;
	getAudio: (params: {
		message?: Message;
		args: string[];
		client?: Client;
	}) => Promise<{ data: Song[]; error?: string }>;
	getResource: (song: Song) => Promise<AudioResource | undefined>; // TODO: rename to getAudioResource?
};
