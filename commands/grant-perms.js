const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { PERMISSIONS, grantPermission } = require('../utils/permissionStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('grant-perms')
    .setDescription('Grant a bot permission to a user (owner only).')
    .setDMPermission(false)
    .addStringOption(opt =>
      opt
        .setName('permission')
        .setDescription('Which permission to grant')
        .setRequired(true)
        .addChoices(...PERMISSIONS.map(p => ({ name: p, value: p })))
    )
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to grant this permission to').setRequired(true)
    ),

  async execute(interaction) {
    if (interaction.user.id !== config.OWNER_ID) {
      return interaction.reply({ content: 'Only the bot owner can manage permissions.', ephemeral: true });
    }

    const permission = interaction.options.getString('permission');
    const target = interaction.options.getUser('user');

    await grantPermission(target.id, permission);

    await interaction.reply({
      content: `Granted **${permission}** permission to <@${target.id}>.`,
      ephemeral: true,
    });
  },
};
