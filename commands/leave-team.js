const { SlashCommandBuilder } = require('discord.js');
const { loadTeams, saveTeams, findTeamByPlayer, withLock } = require('../utils/teamStore');
const { postTeamLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave-team')
    .setDescription('Leave your current team.')
    .setDMPermission(false),

  async execute(interaction) {
    await withLock(async () => {
      const teams = await loadTeams();
      const entry = findTeamByPlayer(teams, interaction.user.id);

      if (!entry) {
        return interaction.reply({ content: "You're not on a team.", ephemeral: true });
      }

      const [teamName, team] = entry;

      if (team.captainId === interaction.user.id) {
        return interaction.reply({
          content: `You're the captain of **${teamName}**. Captains can't just leave — use /disband-team instead if you want to shut the team down.`,
          ephemeral: true,
        });
      }

      team.players = team.players.filter(id => id !== interaction.user.id);
      await saveTeams(teams);

      await interaction.reply({ content: `You have left **${teamName}**.`, ephemeral: true });
      await postTeamLog(interaction.client, `🔴 <@${interaction.user.id}> left **${teamName}**.`);
    });
  },
};
