import { default as clear } from './clear.js';
import { default as help } from './help.js';
import { default as leave } from './leave.js';
import { default as pause } from './pause.js';
import { default as ping } from './ping.js';
import { default as play } from './play.js';
import { default as queue } from './queue.js';
import { default as shuffle } from './shuffle.js';
import { default as skip } from './skip.js';
import { default as stop } from './stop.js';
import { default as unpause } from './unpause.js';

/** @type {Record<string, import('../').Command>} */
export default {
	clear: clear,
	help: help,
	leave: leave,
	pause: pause,
	ping: ping,
	play: play,
	queue: queue,
	shuffle: shuffle,
	skip: skip,
	stop: stop,
	unpause: unpause
};
