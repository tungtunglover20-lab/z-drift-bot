// Team names are restricted to a safe character set. This keeps things
// readable and also keeps them safe to embed inside button customIds.
const fs = require('fs');
const path = require('path');

const TEAM_NAME_REGEX = /^[A-Za-z0-9 _-]{2,32}$/;

function isValidTeamName(name) {
  return TEAM_NAME_REGEX.test(name);
}

// ---------------------------------------------------------------------
// Basic team-name profanity filter.
//
// The word list lives in config/banned-words.json so it's easy to edit
// without touching code — add or remove words (including any regional
// slurs or slang you want blocked that we intentionally left out of the
// default list) and commit + push to update it.
//
// Matching is a simple normalized substring check (lowercase, spaces and
// punctuation stripped). That's deliberately basic: it will catch things
// like "F.U.C.K. Squad", but it can also false-positive on innocent words
// that merely contain a banned word as a substring (e.g. "assassins"
// contains "ass"). If that becomes a problem, tighten the matching in
// containsBannedWord() below to compare whole words instead.
// ---------------------------------------------------------------------
const BANNED_WORDS_FILE = path.join(__dirname, '..', 'config', 'banned-words.json');

function loadBannedWords() {
  try {
    const raw = fs.readFileSync(BANNED_WORDS_FILE, 'utf8');
    const words = JSON.parse(raw);
    return Array.isArray(words) ? words.map(w => String(w).toLowerCase()) : [];
  } catch (err) {
    console.error(`Failed to read ${BANNED_WORDS_FILE}:`, err);
    return [];
  }
}

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function containsBannedWord(name) {
  const normalized = normalize(name);
  const bannedWords = loadBannedWords();
  return bannedWords.some(word => normalized.includes(normalize(word)));
}

module.exports = { TEAM_NAME_REGEX, isValidTeamName, containsBannedWord };
