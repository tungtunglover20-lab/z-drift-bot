const config = require('../config');
const {
  loadInvites,
  getInvitesForUser,
  removeInvite,
  removeInvitesForUser,
} = require('../utils/inviteStore');
const { loadTeams, saveTeams, findTeamByPlayer, withLock } = require('../utils/teamStore');
const { loadSuspensions, getActiveSuspension } = require('../utils/suspensionStore');
const { recordJoin } = require('../utils/historyStore');
const { postTeamLog } = require('../utils/logger');
const { buildInviteRows, buildInviteList } = require('../utils/inviteFormat');

// customId format: teaminvite::accept::<inviteId>
//              or: teaminvite::decline::<inviteId>
async function handleTeamInviteButton(interaction) {
  const [, action, inviteId] = interaction.customId.split('::');
  const inviteeId = interaction.user.id;

  const allInvites = await loadInvites();
  const invite = allInvites.find(i => i.id === inviteId);

  if (!invite) {
    return interaction.update({ content: 'This invite is no longer available.', components: [] });
  }
  if (invite.inviteeId !== inviteeId) {
    // Shouldn't normally happen since this message was ephemeral to the
    // invitee in the first place, but guard against it defensively.
    return interaction.reply({ content: "This isn't your invite.", ephemeral: true });
  }

  if (action === 'decline') {
    const remaining = await removeInvite(inviteId);
    const mine = getInvitesForUser(remaining, inviteeId);
    await interaction.update({
      content: mine.length
        ? `Declined **${invite.team}**. Your remaining invites:\n${buildInviteList(mine)}`
        : `Declined **${invite.team}**. You have no other pending invites.`,
      components: buildInviteRows(mine),
    });
    return;
  }

  if (action !== 'accept') return; // unknown action, ignore defensively

  // Re-check eligibility at accept-time — things may have changed since
  // the invite was sent (suspension, team filled up, team disbanded, etc.)
  const suspensions = await loadSuspensions();
  const activeSuspension = getActiveSuspension(suspensions, inviteeId);
  if (activeSuspension) {
    await interaction.update({
      content: `You're suspended from joining a team until <t:${Math.floor(activeSuspension.until / 1000)}:F>.`,
      components: [],
    });
    return;
  }

  await withLock(async () => {
    const teams = await loadTeams();

    if (!teams[invite.team]) {
      await removeInvite(inviteId);
      await interaction.update({ content: `**${invite.team}** no longer exists.`, components: [] });
      return;
    }

    const alreadyOnTeam = findTeamByPlayer(teams, inviteeId);
    if (alreadyOnTeam) {
      await interaction.update({
        content: `You're already on **${alreadyOnTeam[0]}** and can't join another team.`,
        components: [],
      });
      return;
    }

    if (teams[invite.team].players.length >= config.MAX_TEAM_SIZE) {
      await removeInvite(inviteId);
      await interaction.update({
        content: `**${invite.team}** is already full (max ${config.MAX_TEAM_SIZE} players).`,
        components: [],
      });
      return;
    }

    teams[invite.team].players.push(inviteeId);
    await saveTeams(teams);
    await recordJoin(inviteeId, invite.team, 'player');

    // They can only be on one team, so any other pending invites are now moot.
    await removeInvitesForUser(inviteeId);

    await interaction.update({ content: `You've joined **${invite.team}**!`, components: [] });

    await postTeamLog(interaction.client, `🟢 <@${inviteeId}> joined **${invite.team}**!`);
  });
}

module.exports = { handleTeamInviteButton };
