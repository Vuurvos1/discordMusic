/** @type {import('../').Command} */
export default {
	name: 'queue',
	description: 'Show current queue',
	permissions: {
		memberInVoice: true
	},

	interaction: async ({ interaction, server }) => {
		if (!interaction.guild) return;

		if (!server || server.songs.length < 1) {
			return interaction.reply({
				content: '```nim\nThe queue is empty ;-;\n```',
				ephemeral: true
			});
		}

		return interaction.reply({
			content: buildQueueMsg(server.songs.slice(0, 10)),
			ephemeral: true
		});
	}
};

/** @param {import('../').Song[]} songs */
function buildQueueMsg(songs) {
	let queueMsg = '```nim\n';

	for (let i = 0; i < songs.length; i++) {
		const song = songs[i];
		if (i === 0) {
			queueMsg += '    ⬐ current track\n';
		}

		queueMsg += `${i + 1}) ${
			song.title.length > 40 ? song.title.substring(0, 40 - 1) + '…' : song.title.padEnd(40, ' ')
		} ${song.duration}\n`;
		// TODO show time left for current song `2:39 left`

		if (i === 0) {
			queueMsg += '    ⬑ current track\n';
		}
	}

	queueMsg += '```';
	return queueMsg;
}
