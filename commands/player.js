const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadTeams, findTeamByPlayer } = require('../utils/teamStore');
const { loadHistory, getHistoryFor } = require('../utils/historyStore');
const { loadSuspensions, getActiveSuspension } = require('../utils/suspensionStore');

function formatDate(iso) {
  return new Date(iso).toISOString().slice(0, 10);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('player')
    .setDescription("Show a player's current and past teams.")
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('player').setDescription('The player to look up').setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('player');
    const teams = await loadTeams();
    const history = await loadHistory();
    const entries = getHistoryFor(history, user.id);

    const currentEntry = findTeamByPlayer(teams, user.id);
    const currentText = currentEntry
      ? `**${currentEntry[0]}** (${currentEntry[1].captainId === user.id ? 'Captain' : 'Player'})`
      : 'Not currently on a team.';

    // Past teams: closed entries, plus any "open" entry that teams.json no
    // longer confirms (covers a team being disbanded out from under them).
    const pastEntries = entries.filter(e => {
      if (e.leftAt !== null) return true;
      return !currentEntry || currentEntry[0] !== e.team;
    });

    const trimmedPast = pastEntries.slice(-15);
    const pastText = trimmedPast.length
      ? trimmedPast
          .map(e => {
            const roleLabel = e.role === 'captain' ? 'Captain' : 'Player';
            const dates = e.leftAt
              ? `${formatDate(e.joinedAt)} → ${formatDate(e.leftAt)}`
              : `${formatDate(e.joinedAt)} → present (team disbanded)`;
            return `• **${e.team}** (${roleLabel}) — ${dates}`;
          })
          .join('\n')
      : 'None.';

    const embed = new EmbedBuilder()
      .setTitle(`${user.username}'s Team History`)
      .setColor(0x5865f2)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: 'Current Team', value: currentText },
        { name: pastEntries.length > 15 ? 'Past Teams (last 15)' : 'Past Teams', value: pastText }
      );

    const suspensions = await loadSuspensions();
    const activeSuspension = getActiveSuspension(suspensions, user.id);
    if (activeSuspension) {
      embed.addFields({
        name: 'Suspended',
        value: `Until <t:${Math.floor(activeSuspension.until / 1000)}:F>`,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
