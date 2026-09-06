const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { loadTeams, findTeamByPlayer, findTeamByCaptain } = require('../utils/teamStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite-player')
    .setDescription("Invite a player to join your team (captains only).")
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
    const [teamName] = captainEntry;

    const alreadyOnTeam = findTeamByPlayer(teams, invitee.id);
    if (alreadyOnTeam) {
      return interaction.reply({
        content: `<@${invitee.id}> is already on a team (**${alreadyOnTeam[0]}**) and can't join another.`,
        ephemeral: true,
      });
    }

    // Encode everything needed into the button's customId so this still
    // works correctly even if the bot restarts before the invite is
    // accepted/declined (no in-memory state required).
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`invite::accept::${teamName}::${interaction.user.id}::${invitee.id}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`invite::decline::${teamName}::${interaction.user.id}::${invitee.id}`)
        .setLabel('Decline')
        .setStyle(ButtonStyle.Danger)
    );

    // Not ephemeral — the invited player needs to actually see this message.
    await interaction.reply({
      content: `<@${invitee.id}>, you've been invited to join **${teamName}** by <@${interaction.user.id}>!`,
      components: [row],
    });
  },
};
