// Persists pending team invites (data/invites.json). Invites are private:
// /invite-player creates one here (and best-effort DMs the invitee), and
// the invitee views/accepts/declines it themselves via /team-invites,
// which is an ephemeral reply only they can see.

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INVITES_FILE = path.join(DATA_DIR, 'invites.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(INVITES_FILE)) {
    fs.writeFileSync(INVITES_FILE, '[]\n', 'utf8');
  }
}
ensureDataFile();

async function loadInvites() {
  const raw = await fsp.readFile(INVITES_FILE, 'utf8');
  try {
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    console.error(`Failed to parse ${INVITES_FILE}, treating as empty:`, err);
    return [];
  }
}

async function saveInvites(invites) {
  await fsp.writeFile(INVITES_FILE, JSON.stringify(invites, null, 2) + '\n', 'utf8');
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

function findPendingInvite(invites, teamName, inviteeId) {
  return invites.find(
    i => i.team.toLowerCase() === teamName.toLowerCase() && i.inviteeId === inviteeId
  );
}

function getInvitesForUser(invites, inviteeId) {
  return invites.filter(i => i.inviteeId === inviteeId);
}

async function createInvite(teamName, inviterId, inviteeId) {
  return withLock(async () => {
    const invites = await loadInvites();
    // Replace any existing identical pending invite rather than duplicating it.
    const filtered = invites.filter(
      i => !(i.team.toLowerCase() === teamName.toLowerCase() && i.inviteeId === inviteeId)
    );
    const invite = {
      id: crypto.randomUUID(),
      team: teamName,
      inviterId,
      inviteeId,
      createdAt: new Date().toISOString(),
    };
    filtered.push(invite);
    await saveInvites(filtered);
    return invite;
  });
}

async function removeInvite(id) {
  return withLock(async () => {
    const invites = await loadInvites();
    const filtered = invites.filter(i => i.id !== id);
    await saveInvites(filtered);
    return filtered;
  });
}

async function removeInvitesForUser(inviteeId) {
  return withLock(async () => {
    const invites = await loadInvites();
    const filtered = invites.filter(i => i.inviteeId !== inviteeId);
    await saveInvites(filtered);
    return filtered;
  });
}

module.exports = {
  INVITES_FILE,
  loadInvites,
  saveInvites,
  findPendingInvite,
  getInvitesForUser,
  createInvite,
  removeInvite,
  removeInvitesForUser,
};
