const { SlashCommandBuilder } = require('discord.js');
const { loadTeams, saveTeams, findTeamByCaptain, withLock } = require('../utils/teamStore');
const { recordLeave } = require('../utils/historyStore');
const { postTeamLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick-player')
    .setDescription('Remove a player from your team, freeing up a roster spot (captains only).')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('player').setDescription('The player to remove').setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('player');

    if (target.id === interaction.user.id) {
      return interaction.reply({
        content: "You can't kick yourself — use /disband-team if you want to shut the team down.",
        ephemeral: true,
      });
    }

    await withLock(async () => {
      const teams = await loadTeams();
      const entry = findTeamByCaptain(teams, interaction.user.id);

      if (!entry) {
        return interaction.reply({ content: "You're not the captain of any team.", ephemeral: true });
      }

      const [teamName, team] = entry;

      if (!team.players.includes(target.id)) {
        return interaction.reply({
          content: `<@${target.id}> isn't on **${teamName}**.`,
          ephemeral: true,
        });
      }

      team.players = team.players.filter(id => id !== target.id);
      await saveTeams(teams);
      await recordLeave(target.id, teamName);

      await interaction.reply({
        content: `<@${target.id}> has been removed from **${teamName}**.`,
        ephemeral: true,
      });
      await postTeamLog(
        interaction.client,
        `🔴 <@${target.id}> was removed from **${teamName}** by the captain.`
      );
    });
  },
};
