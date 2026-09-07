const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Discord allows at most 5 action rows per message.
function buildInviteRows(invites) {
  return invites.slice(0, 5).map(invite =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`teaminvite::accept::${invite.id}`)
        .setLabel(`Accept ${invite.team}`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`teaminvite::decline::${invite.id}`)
        .setLabel(`Decline ${invite.team}`)
        .setStyle(ButtonStyle.Danger)
    )
  );
}

function buildInviteList(invites) {
  return invites.map(i => `• **${i.team}** — invited by <@${i.inviterId}>`).join('\n');
}

module.exports = { buildInviteRows, buildInviteList };
