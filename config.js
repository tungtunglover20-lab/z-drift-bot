// General bot configuration.
// Nothing in this file is secret — it's safe to commit to GitHub.
// Secrets (bot token, channel IDs, etc.) live in environment variables instead (see .env.example).

module.exports = {
  // The role automatically created/assigned when someone runs /create-team.
  CAPTAIN_ROLE_NAME: 'Captain',

  // Maximum players on a team, captain included.
  MAX_TEAM_SIZE: 6,

  // ---------------------------------------------------------------------
  // The ONLY Discord ID hardcoded in this bot: you, the owner.
  // This is the one person who can run /grant-perms and /remove-perms.
  // Everyone else's access to /weekly-match, /log-match, and /suspend is
  // granted or revoked at runtime through those two commands — not by
  // editing this file. See the README for details.
  //
  // How to get your Discord ID: enable Developer Mode
  // (User Settings > Advanced > Developer Mode), then right-click your
  // own name/avatar and choose "Copy User ID".
  // ---------------------------------------------------------------------
  OWNER_ID: '1253564117483126841',
};
