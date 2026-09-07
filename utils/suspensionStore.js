// Tracks player suspensions (data/suspensions.json), set via /suspend.
// A suspended player is kicked from their current team immediately and
// can't create or join another team until their suspension expires.

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const SUSPENSIONS_FILE = path.join(DATA_DIR, 'suspensions.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SUSPENSIONS_FILE)) {
    fs.writeFileSync(SUSPENSIONS_FILE, '{}\n', 'utf8');
  }
}
ensureDataFile();

async function loadSuspensions() {
  const raw = await fsp.readFile(SUSPENSIONS_FILE, 'utf8');
  try {
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    console.error(`Failed to parse ${SUSPENSIONS_FILE}, treating as empty:`, err);
    return {};
  }
}

async function saveSuspensions(data) {
  await fsp.writeFile(SUSPENSIONS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
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

async function suspendUser(userId, weeks, suspendedBy) {
  return withLock(async () => {
    const data = await loadSuspensions();
    const until = Date.now() + weeks * 7 * 24 * 60 * 60 * 1000;
    data[userId] = { until, weeks, suspendedBy, suspendedAt: Date.now() };
    await saveSuspensions(data);
    return data[userId];
  });
}

// Returns the active suspension record for a user, or null if they have
// none / it has already expired.
function getActiveSuspension(data, userId) {
  const entry = data[userId];
  if (!entry) return null;
  if (Date.now() >= entry.until) return null;
  return entry;
}

module.exports = {
  SUSPENSIONS_FILE,
  loadSuspensions,
  saveSuspensions,
  suspendUser,
  getActiveSuspension,
};
