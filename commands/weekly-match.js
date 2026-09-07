const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadTeams } = require('../utils/teamStore');
const { loadPermissions, hasPermission } = require('../utils/permissionStore');

// Fisher-Yates shuffle
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly-match')
    .setDescription('Randomly assign every team a match for the week (authorized users only).')
    .setDMPermission(false)
    .addIntegerOption(opt =>
      opt
        .setName('week')
        .setDescription('The week number for this set of matchups')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const perms = await loadPermissions();
    if (!hasPermission(perms, interaction.user.id, 'weekly-match')) {
      return interaction.reply({
        content: "You're not authorized to use this command.",
        ephemeral: true,
      });
    }

    const week = interaction.options.getInteger('week');
    const teams = await loadTeams();
    const teamNames = Object.keys(teams);

    if (teamNames.length < 2) {
      return interaction.reply({
        content: 'There need to be at least 2 registered teams to create matchups.',
        ephemeral: true,
      });
    }

    // Shuffle, then pair sequentially. Each team ends up in at most one
    // match — a team is only ever paired with "another team that doesn't
    // have a match already" this round, by construction.
    const shuffled = shuffle(teamNames);
    const pairings = [];
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      pairings.push([shuffled[i], shuffled[i + 1]]);
    }
    const bye = shuffled.length % 2 === 1 ? shuffled[shuffled.length - 1] : null;

    const description =
      pairings.map(([a, b]) => `**${a}** 🆚 **${b}**`).join('\n') +
      (bye ? `\n\n**${bye}** has a bye this week.` : '');

    const embed = new EmbedBuilder()
      .setTitle(`📅 Week ${week} Matchups`)
      .setColor(0x5865f2)
      .setDescription(description)
      .setTimestamp();

    // Intentionally NOT ephemeral — this needs to be visible to everyone.
    await interaction.reply({ embeds: [embed] });
  },
};
