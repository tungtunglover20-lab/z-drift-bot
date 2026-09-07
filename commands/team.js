const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadTeams } = require('../utils/teamStore');
const { loadMatches, computeRecord } = require('../utils/matchStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription("Show a team's roster and match record.")
    .setDMPermission(false)
    .addStringOption(opt =>
      opt
        .setName('team_name')
        .setDescription('The team to look up')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const teams = await loadTeams();
    const matches = await loadMatches();
    const names = new Set(Object.keys(teams));
    for (const m of matches) {
      names.add(m.team1);
      names.add(m.team2);
    }
    const options = [...names]
      .filter(n => n.toLowerCase().includes(focused))
      .slice(0, 25)
      .map(n => ({ name: n, value: n }));
    await interaction.respond(options);
  },

  async execute(interaction) {
    const teamName = interaction.options.getString('team_name').trim();
    const teams = await loadTeams();

    // Case-insensitive lookup against the current roster.
    const actualName = Object.keys(teams).find(n => n.toLowerCase() === teamName.toLowerCase());
    const team = actualName ? teams[actualName] : null;

    const matches = await loadMatches();
    const lookupName = actualName || teamName;
    const { wins, losses, matches: teamMatches } = computeRecord(matches, lookupName);

    if (!team && teamMatches.length === 0) {
      return interaction.reply({
        content: `No team found named **${teamName}**.`,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder().setTitle(actualName || teamName).setColor(0x57f287);

    if (team) {
      embed.addFields(
        { name: 'Captain', value: `<@${team.captainId}>`, inline: true },
        { name: 'Record', value: `${wins}-${losses}`, inline: true },
        {
          name: `Roster (${team.players.length})`,
          value: team.players.map(id => `<@${id}>`).join('\n') || 'No players.',
        }
      );
    } else {
      embed.setDescription('⚠️ This team is no longer active.');
      embed.addFields({ name: 'Record', value: `${wins}-${losses}`, inline: true });
    }

    if (teamMatches.length) {
      const recent = [...teamMatches].reverse().slice(0, 10); // most recent first
      const lines = recent.map(m => {
        const isTeam1 = m.team1.toLowerCase() === lookupName.toLowerCase();
        const opponent = isTeam1 ? m.team2 : m.team1;
        const won = m.winner.toLowerCase() === lookupName.toLowerCase();
        const myScore = isTeam1 ? m.team1Wins : m.team2Wins;
        const oppScore = isTeam1 ? m.team2Wins : m.team1Wins;
        return `Week ${m.week}: ${won ? 'W' : 'L'} vs **${opponent}** (${myScore}-${oppScore})`;
      });
      embed.addFields({
        name: teamMatches.length > 10 ? 'Recent Matches (last 10)' : 'Match History',
        value: lines.join('\n'),
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
