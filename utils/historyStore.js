// Tracks each player's team membership history over time (player-history.json).
// teams.json only reflects *current* state, so this is what lets /player
// answer "what teams has this person been on before?"

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'player-history.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, '{}\n', 'utf8');
  }
}
ensureDataFile();

async function loadHistory() {
  const raw = await fsp.readFile(HISTORY_FILE, 'utf8');
  try {
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    console.error(`Failed to parse ${HISTORY_FILE}, treating as empty:`, err);
    return {};
  }
}

async function saveHistory(history) {
  await fsp.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2) + '\n', 'utf8');
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

// Call when a player joins a team (as captain via /create-team, or as a
// regular player by accepting an invite).
async function recordJoin(userId, teamName, role) {
  await withLock(async () => {
    const history = await loadHistory();
    if (!history[userId]) history[userId] = [];
    history[userId].push({
      team: teamName,
      role, // 'captain' | 'player'
      joinedAt: new Date().toISOString(),
      leftAt: null,
    });
    await saveHistory(history);
  });
}

// Call when a player leaves a team (via /leave-team, or every remaining
// player when a captain runs /disband-team).
async function recordLeave(userId, teamName) {
  await withLock(async () => {
    const history = await loadHistory();
    const entries = history[userId] || [];
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].team === teamName && entries[i].leftAt === null) {
        entries[i].leftAt = new Date().toISOString();
        break;
      }
    }
    history[userId] = entries;
    await saveHistory(history);
  });
}

function getHistoryFor(history, userId) {
  return history[userId] || [];
}

module.exports = {
  HISTORY_FILE,
  loadHistory,
  saveHistory,
  recordJoin,
  recordLeave,
  getHistoryFor,
};
