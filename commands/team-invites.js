const { SlashCommandBuilder } = require('discord.js');
const { loadInvites, getInvitesForUser } = require('../utils/inviteStore');
const { buildInviteRows, buildInviteList } = require('../utils/inviteFormat');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('team-invites')
    .setDescription('View and respond to your pending team invites (only visible to you).')
    .setDMPermission(false),

  async execute(interaction) {
    const invites = await loadInvites();
    const mine = getInvitesForUser(invites, interaction.user.id);

    if (mine.length === 0) {
      return interaction.reply({ content: "You don't have any pending invites.", ephemeral: true });
    }

    // Ephemeral — invites are never shown publicly. Only the invitee can
    // see or act on this message.
    await interaction.reply({
      content: `Your pending invites:\n${buildInviteList(mine)}`,
      components: buildInviteRows(mine),
      ephemeral: true,
    });
  },
};
