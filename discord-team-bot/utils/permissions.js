// Authorization check for /weekly-match, backed by a JSON file
// (config/authorized-schedulers.json) rather than hardcoded in a .js file,
// so it's easy to find and edit as a standalone list.
//
// To add someone: open config/authorized-schedulers.json, add their
// Discord user ID as a string, then commit + push (Railway will
// automatically redeploy with the change).

const fs = require('fs');
const path = require('path');

const SCHEDULERS_FILE = path.join(__dirname, '..', 'config', 'authorized-schedulers.json');

function isAuthorizedScheduler(userId) {
  let ids;
  try {
    const raw = fs.readFileSync(SCHEDULERS_FILE, 'utf8');
    ids = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read/parse ${SCHEDULERS_FILE}:`, err);
    return false;
  }
  return Array.isArray(ids) && ids.includes(userId);
}

module.exports = { isAuthorizedScheduler };
