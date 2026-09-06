// Team names are restricted to a safe character set. This keeps things
// readable and also keeps them safe to embed inside button customIds
// (used by the /invite-player accept/decline buttons), which are split
// on "::".
const TEAM_NAME_REGEX = /^[A-Za-z0-9 _-]{2,32}$/;

function isValidTeamName(name) {
  return TEAM_NAME_REGEX.test(name);
}

module.exports = { TEAM_NAME_REGEX, isValidTeamName };
