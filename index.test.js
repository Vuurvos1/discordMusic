import { describe, it, vi } from 'vitest';

describe('message handler', () => {
	const message = {
		content: '',
		author: {
			bot: false
		},
		channel: {
			send: vi.fn()
		},
		react: vi.fn()
	};

	it('should not handle bot messages', () => {
		// message.author.bot = true;
		// expect(message.author.bot).toBe(true);
	});

	it('should not handle messages without prefix', () => {});

	it('should handle messages with command prefix', () => {});
});
