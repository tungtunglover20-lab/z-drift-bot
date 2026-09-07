// Runtime-managed permissions (data/permissions.json), granted/revoked via
// the /grant-perms and /remove-perms commands (owner only). Unlike the
// old file-based whitelist, this is meant to be edited live through
// Discord, not by editing files in the repo — so it lives in DATA_DIR
// alongside teams.json (make sure your Railway Volume covers it).

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const config = require('../config');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const PERMISSIONS_FILE = path.join(DATA_DIR, 'permissions.json');

// The full set of grantable permissions. Add more here if you add more
// staff-gated commands later — they'll automatically show up as choices
// in /grant-perms and /remove-perms.
const PERMISSIONS = ['weekly-match', 'log-match', 'suspend'];

function emptyPermissions() {
  const obj = {};
  for (const p of PERMISSIONS) obj[p] = [];
  return obj;
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PERMISSIONS_FILE)) {
    fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(emptyPermissions(), null, 2) + '\n', 'utf8');
  }
}
ensureDataFile();

async function loadPermissions() {
  const raw = await fsp.readFile(PERMISSIONS_FILE, 'utf8');
  let parsed;
  try {
    parsed = raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    console.error(`Failed to parse ${PERMISSIONS_FILE}, treating as empty:`, err);
    parsed = {};
  }
  // Make sure every known permission key exists, even if the file predates it.
  for (const p of PERMISSIONS) {
    if (!Array.isArray(parsed[p])) parsed[p] = [];
  }
  return parsed;
}

async function savePermissions(perms) {
  await fsp.writeFile(PERMISSIONS_FILE, JSON.stringify(perms, null, 2) + '\n', 'utf8');
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

// The owner (config.OWNER_ID) always has every permission, automatically.
function hasPermission(perms, userId, permission) {
  if (userId === config.OWNER_ID) return true;
  return Array.isArray(perms[permission]) && perms[permission].includes(userId);
}

async function grantPermission(userId, permission) {
  return withLock(async () => {
    const perms = await loadPermissions();
    if (!perms[permission].includes(userId)) perms[permission].push(userId);
    await savePermissions(perms);
    return perms;
  });
}

async function revokePermission(userId, permission) {
  return withLock(async () => {
    const perms = await loadPermissions();
    perms[permission] = perms[permission].filter(id => id !== userId);
    await savePermissions(perms);
    return perms;
  });
}

module.exports = {
  PERMISSIONS,
  PERMISSIONS_FILE,
  loadPermissions,
  savePermissions,
  hasPermission,
  grantPermission,
  revokePermission,
};
