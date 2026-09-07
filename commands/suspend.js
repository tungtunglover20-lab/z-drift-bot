const { SlashCommandBuilder } = require('discord.js');
const { loadPermissions, hasPermission } = require('../utils/permissionStore');
const { loadTeams, saveTeams, findTeamByPlayer, withLock } = require('../utils/teamStore');
const { suspendUser } = require('../utils/suspensionStore');
const { recordLeave } = require('../utils/historyStore');
const { postTeamLog } = require('../utils/logger');
const { getOrCreateCaptainRole } = require('../utils/roles');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suspend')
    .setDescription('Kick a player from their team and suspend them from joining a new one (staff only).')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('player').setDescription('The player to suspend').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('weeks')
        .setDescription('How many weeks the suspension lasts')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const perms = await loadPermissions();
    if (!hasPermission(perms, interaction.user.id, 'suspend')) {
      return interaction.reply({
        content: "You're not authorized to use this command.",
        ephemeral: true,
      });
    }

    const target = interaction.options.getUser('player');
    const weeks = interaction.options.getInteger('weeks');

    await withLock(async () => {
      const teams = await loadTeams();
      const entry = findTeamByPlayer(teams, target.id);

      if (entry) {
        const [teamName, team] = entry;
        const wasCaptain = team.captainId === target.id;

        if (wasCaptain) {
          // No captain left to run it, so suspending one disbands the team.
          for (const playerId of team.players) {
            await recordLeave(playerId, teamName);
          }
          delete teams[teamName];
          await saveTeams(teams);

          try {
            const role = await getOrCreateCaptainRole(interaction.guild);
            const member = await interaction.guild.members.fetch(target.id).catch(() => null);
            if (member) await member.roles.remove(role);
          } catch (err) {
            console.error('Failed to remove Captain role during suspension:', err);
          }

          await postTeamLog(
            interaction.client,
            `⚫ **${teamName}** was disbanded — its captain <@${target.id}> was suspended.`
          );
        } else {
          team.players = team.players.filter(id => id !== target.id);
          await saveTeams(teams);
          await recordLeave(target.id, teamName);

          await postTeamLog(
            interaction.client,
            `🔴 <@${target.id}> was removed from **${teamName}** (suspended).`
          );
        }
      }

      const suspension = await suspendUser(target.id, weeks, interaction.user.id);

      await interaction.reply({
        content:
          `<@${target.id}> has been suspended for ${weeks} week${weeks === 1 ? '' : 's'}` +
          `${entry ? ' and removed from their team' : ' (they were not on a team)'}. ` +
          `They can rejoin/create a team after <t:${Math.floor(suspension.until / 1000)}:F>.`,
        ephemeral: true,
      });
    });
  },
};
