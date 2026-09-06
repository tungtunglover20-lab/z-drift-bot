// Reads and writes the team database (teams.json).
//
// NOTE: This bot is designed for use in a single Discord server. Team
// names and player membership are not scoped per-guild. If you ever plan
// to run this bot in more than one server, this file is where you'd add
// guild scoping (e.g. keying everything by guild ID).
//
// IMPORTANT (Railway users): Railway's default filesystem is wiped on
// every redeploy/restart. Set the DATA_DIR environment variable to a
// path inside a Railway Volume (e.g. DATA_DIR=/data) so teams.json
// survives deploys. See the README for setup steps.

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const TEAMS_FILE = path.join(DATA_DIR, 'teams.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TEAMS_FILE)) {
    fs.writeFileSync(TEAMS_FILE, '{}\n', 'utf8');
  }
}
ensureDataFile();

async function loadTeams() {
  const raw = await fsp.readFile(TEAMS_FILE, 'utf8');
  try {
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    console.error(`Failed to parse ${TEAMS_FILE}, treating as empty:`, err);
    return {};
  }
}

async function saveTeams(teams) {
  await fsp.writeFile(TEAMS_FILE, JSON.stringify(teams, null, 2) + '\n', 'utf8');
}

// Returns [teamName, teamObject] for the team a given user plays on, or null.
function findTeamByPlayer(teams, userId) {
  for (const [name, team] of Object.entries(teams)) {
    if (team.players.includes(userId)) return [name, team];
  }
  return null;
}

// Returns [teamName, teamObject] for the team a given user captains, or null.
function findTeamByCaptain(teams, userId) {
  for (const [name, team] of Object.entries(teams)) {
    if (team.captainId === userId) return [name, team];
  }
  return null;
}

// Very small in-process mutex so concurrent commands (e.g. two people
// clicking "accept" at the same moment) can't corrupt teams.json with
// interleaved read-modify-write operations.
let lock = Promise.resolve();
function withLock(fn) {
  const result = lock.then(() => fn());
  lock = result.then(
    () => {},
    () => {} // swallow errors here so one failed op doesn't jam the queue forever
  );
  return result;
}

module.exports = {
  DATA_DIR,
  TEAMS_FILE,
  loadTeams,
  saveTeams,
  findTeamByPlayer,
  findTeamByCaptain,
  withLock,
};
