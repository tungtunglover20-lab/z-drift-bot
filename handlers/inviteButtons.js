const { loadTeams, saveTeams, findTeamByPlayer, withLock } = require('../utils/teamStore');
const { postTeamLog } = require('../utils/logger');

// customId format: invite::accept::<teamName>::<inviterId>::<inviteeId>
//              or: invite::decline::<teamName>::<inviterId>::<inviteeId>
async function handleInviteButton(interaction) {
  const [, action, teamName, , inviteeId] = interaction.customId.split('::');

  if (interaction.user.id !== inviteeId) {
    return interaction.reply({ content: "This invite isn't for you.", ephemeral: true });
  }

  if (action === 'decline') {
    await interaction.update({
      content: `<@${inviteeId}> declined the invitation to join **${teamName}**.`,
      components: [],
    });
    return;
  }

  if (action !== 'accept') return; // unknown action, ignore defensively

  await withLock(async () => {
    const teams = await loadTeams();

    if (!teams[teamName]) {
      await interaction.update({
        content: `This team (**${teamName}**) no longer exists.`,
        components: [],
      });
      return;
    }

    const alreadyOnTeam = findTeamByPlayer(teams, inviteeId);
    if (alreadyOnTeam) {
      await interaction.update({
        content: `<@${inviteeId}> is already on a team (**${alreadyOnTeam[0]}**) and can't join another.`,
        components: [],
      });
      return;
    }

    teams[teamName].players.push(inviteeId);
    await saveTeams(teams);

    await interaction.update({
      content: `<@${inviteeId}> has joined **${teamName}**!`,
      components: [],
    });

    await postTeamLog(interaction.client, `🟢 <@${inviteeId}> joined **${teamName}**!`);
  });
}

module.exports = { handleInviteButton };
