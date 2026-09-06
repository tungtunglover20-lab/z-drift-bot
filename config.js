// General bot configuration.
// Nothing in this file is secret — it's safe to commit to GitHub.
// Secrets (bot token, channel IDs, etc.) live in environment variables instead (see .env.example).

module.exports = {
  // The role automatically created/assigned when someone runs /create-team.
  CAPTAIN_ROLE_NAME: 'Captain',

  // ---------------------------------------------------------------------
  // Discord user IDs allowed to run /log-match.
  // Add the Discord IDs of your league staff/admins below as strings.
  //
  // How to get a Discord ID: enable Developer Mode in Discord
  // (User Settings > Advanced > Developer Mode), then right-click a
  // user and choose "Copy User ID".
  //
  // Example:
  // AUTHORIZED_LOGGERS: ['123456789012345678', '234567890123456789'],
  // ---------------------------------------------------------------------
  AUTHORIZED_LOGGERS: [
    // <-- add authorized Discord user IDs here, one per line, as strings
  ],
};
