const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { PERMISSIONS, revokePermission } = require('../utils/permissionStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-perms')
    .setDescription('Revoke a bot permission from a user (owner only).')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt
        .setName('permission')
        .setDescription('Which permission to remove')
        .setRequired(true)
        .addChoices(...PERMISSIONS.map(p => ({ name: p, value: p })))
    )
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to remove this permission from').setRequired(true)
    ),

  async execute(interaction) {
    if (interaction.user.id !== config.OWNER_ID) {
      return interaction.reply({ content: 'Only the bot owner can manage permissions.', ephemeral: true });
    }

    const permission = interaction.options.getString('permission');
    const target = interaction.options.getUser('user');

    await revokePermission(target.id, permission);

    await interaction.reply({
      content: `Removed **${permission}** permission from <@${target.id}>.`,
      ephemeral: true,
    });
  },
};
