const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { loadTeams, findTeamByPlayer, findTeamByCaptain } = require('../utils/teamStore');
const { createInvite, loadInvites, findPendingInvite } = require('../utils/inviteStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite-player')
    .setDescription('Privately invite a player to join your team (captains only).')
    .setDMPermission(false)
    .addUserOption(opt =>
      opt.setName('player').setDescription('The player to invite').setRequired(true)
    ),

  async execute(interaction) {
    const invitee = interaction.options.getUser('player');

    if (invitee.bot) {
      return interaction.reply({ content: "You can't invite a bot to a team.", ephemeral: true });
    }
    if (invitee.id === interaction.user.id) {
      return interaction.reply({ content: "You can't invite yourself.", ephemeral: true });
    }

    const teams = await loadTeams();
    const captainEntry = findTeamByCaptain(teams, interaction.user.id);

    if (!captainEntry) {
      return interaction.reply({
        content: 'Only team captains can invite players. Create a team first with /create-team.',
        ephemeral: true,
      });
    }
    const [teamName, team] = captainEntry;

    if (team.players.length >= config.MAX_TEAM_SIZE) {
      return interaction.reply({
        content: `Your team is already at the ${config.MAX_TEAM_SIZE}-player cap.`,
        ephemeral: true,
      });
    }

    const alreadyOnTeam = findTeamByPlayer(teams, invitee.id);
    if (alreadyOnTeam) {
      return interaction.reply({
        content: `<@${invitee.id}> is already on a team (**${alreadyOnTeam[0]}**) and can't join another.`,
        ephemeral: true,
      });
    }

    const invites = await loadInvites();
    if (findPendingInvite(invites, teamName, invitee.id)) {
      return interaction.reply({
        content: `<@${invitee.id}> already has a pending invite to **${teamName}**.`,
        ephemeral: true,
      });
    }

    await createInvite(teamName, interaction.user.id, invitee.id);

    // Best-effort DM heads-up — not required for the invite to work, so a
    // failure here (e.g. the player has DMs closed) is not a problem.
    // The real place they respond is /team-invites.
    try {
      await invitee.send(
        `You've been invited to join **${teamName}**! Run /team-invites in the server to view and respond.`
      );
    } catch (err) {
      // ignore — DMs may be closed
    }

    // Ephemeral and only mentions the invite to the captain — the invitee
    // is not notified in any public/visible channel message.
    await interaction.reply({
      content: `Invite sent to <@${invitee.id}> for **${teamName}**. They can respond with /team-invites.`,
      ephemeral: true,
    });
  },
};
