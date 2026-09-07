const { SlashCommandBuilder } = require('discord.js');
const { loadTeams, saveTeams, findTeamByCaptain, withLock } = require('../utils/teamStore');
const { postTeamLog } = require('../utils/logger');
const { getOrCreateCaptainRole } = require('../utils/roles');
const { recordLeave } = require('../utils/historyStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('disband-team')
    .setDescription('Disband your team (captains only). Removes all players from it.')
    .setDMPermission(false),

  async execute(interaction) {
    await withLock(async () => {
      const teams = await loadTeams();
      const entry = findTeamByCaptain(teams, interaction.user.id);

      if (!entry) {
        return interaction.reply({ content: "You're not the captain of any team.", ephemeral: true });
      }

      const [teamName, team] = entry;

      for (const playerId of team.players) {
        await recordLeave(playerId, teamName);
      }

      delete teams[teamName];
      await saveTeams(teams);

      try {
        const role = await getOrCreateCaptainRole(interaction.guild);
        await interaction.member.roles.remove(role);
      } catch (err) {
        console.error('Failed to remove Captain role:', err);
      }

      await interaction.reply({ content: `**${teamName}** has been disbanded.`, ephemeral: true });
      await postTeamLog(
        interaction.client,
        `⚫ **${teamName}** was disbanded by <@${interaction.user.id}>. All players have been removed.`
      );
    });
  },
};
