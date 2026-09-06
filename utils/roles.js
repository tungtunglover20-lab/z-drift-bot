const config = require('../config');

// Finds the server's "Captain" role, creating it if it doesn't exist yet.
// Requires the bot to have the "Manage Roles" permission.
async function getOrCreateCaptainRole(guild) {
  let role = guild.roles.cache.find(r => r.name === config.CAPTAIN_ROLE_NAME);
  if (!role) {
    role = await guild.roles.create({
      name: config.CAPTAIN_ROLE_NAME,
      mentionable: true,
      reason: 'Auto-created by the team bot for team captains.',
    });
  }
  return role;
}

module.exports = { getOrCreateCaptainRole };
