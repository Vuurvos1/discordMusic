import { describe, it, expect, vi } from 'vitest';
import command from './ping';

describe('ping', () => {
	const send = vi.fn();
	const react = vi.fn();
	const reply = vi.fn();

	/** @type { unknown | import('discord.js').Message} */
	const message = {
		content: '',
		author: {
			bot: false
		},
		channel: {
			send: send
		},
		react: react
	};

	it('should return pong (chat)', async () => {
		// @ts-ignore
		await command.command({ message });
		expect(send).toHaveBeenCalledWith('pong!');
	});

	/** @type { unknown | import('discord.js').ChatInputCommandInteraction} */
	const interaction = {
		reply: reply
	};

	it('should return pong (interaction)', async () => {
		// @ts-expect-error
		await command.interaction({ interaction });
		expect(reply).toHaveBeenCalledWith({
			content: 'pong!',
			ephemeral: true
		});
	});
});
