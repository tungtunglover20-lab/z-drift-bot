// Reads and writes the match history (matches.json), populated by
// /log-match. This is what powers a team's win-loss record in /team.

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const MATCHES_FILE = path.join(DATA_DIR, 'matches.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(MATCHES_FILE)) {
    fs.writeFileSync(MATCHES_FILE, '[]\n', 'utf8');
  }
}
ensureDataFile();

async function loadMatches() {
  const raw = await fsp.readFile(MATCHES_FILE, 'utf8');
  try {
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    console.error(`Failed to parse ${MATCHES_FILE}, treating as empty:`, err);
    return [];
  }
}

async function saveMatches(matches) {
  await fsp.writeFile(MATCHES_FILE, JSON.stringify(matches, null, 2) + '\n', 'utf8');
}

let lock = Promise.resolve();
function withLock(fn) {
  const result = lock.then(() => fn());
  lock = result.then(
    () => {},
    () => {}
  );
  return result;
}

function getMatchesForTeam(matches, teamName) {
  const lower = teamName.toLowerCase();
  return matches.filter(
    m => m.team1.toLowerCase() === lower || m.team2.toLowerCase() === lower
  );
}

function computeRecord(matches, teamName) {
  const relevant = getMatchesForTeam(matches, teamName);
  let wins = 0;
  let losses = 0;
  for (const m of relevant) {
    if (m.winner.toLowerCase() === teamName.toLowerCase()) wins++;
    else losses++;
  }
  return { wins, losses, matches: relevant };
}

module.exports = {
  MATCHES_FILE,
  loadMatches,
  saveMatches,
  withLock,
  getMatchesForTeam,
  computeRecord,
};
