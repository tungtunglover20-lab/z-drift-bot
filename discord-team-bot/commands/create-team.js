const { SlashCommandBuilder } = require('discord.js');
const { loadTeams, saveTeams, findTeamByPlayer, withLock } = require('../utils/teamStore');
const { postTeamLog } = require('../utils/logger');
const { getOrCreateCaptainRole } = require('../utils/roles');
const { isValidTeamName } = require('../utils/validation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create-team')
    .setDescription('Create a new team and become its captain.')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt
        .setName('team_name')
        .setDescription('The name of your new team')
        .setRequired(true)
    ),

  async execute(interaction) {
    const teamName = interaction.options.getString('team_name').trim();

    if (!isValidTeamName(teamName)) {
      return interaction.reply({
        content:
          'Team names must be 2-32 characters and can only contain letters, numbers, spaces, hyphens, and underscores.',
        ephemeral: true,
      });
    }

    await withLock(async () => {
      const teams = await loadTeams();

      const existing = findTeamByPlayer(teams, interaction.user.id);
      if (existing) {
        return interaction.reply({
          content: `You're already on a team called **${existing[0]}**. Leave it first with /leave-team (or use /disband-team if you're its captain).`,
          ephemeral: true,
        });
      }

      const nameTaken = Object.keys(teams).some(
        name => name.toLowerCase() === teamName.toLowerCase()
      );
      if (nameTaken) {
        return interaction.reply({
          content: `A team named **${teamName}** already exists. Please choose a different name.`,
          ephemeral: true,
        });
      }

      teams[teamName] = {
        captainId: interaction.user.id,
        players: [interaction.user.id],
        createdAt: new Date().toISOString(),
      };
      await saveTeams(teams);

      try {
        const role = await getOrCreateCaptainRole(interaction.guild);
        await interaction.member.roles.add(role);
      } catch (err) {
        console.error('Failed to assign Captain role:', err);
      }

      await interaction.reply({
        content: `Team **${teamName}** has been created! You are now its captain.`,
        ephemeral: true,
      });

      await postTeamLog(
        interaction.client,
        `🏆 **${teamName}** was created by <@${interaction.user.id}>!`
      );
    });
  },
};
