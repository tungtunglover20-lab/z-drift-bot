# Discord Team Bot

A Discord bot for running a competitive game server: teams, invites,
weekly matchups, match-result logging, records/history lookups,
suspensions, and role-based staff permissions.

## Commands

| Command | Who can use it | What it does |
|---|---|---|
| `/create-team team_name:` | Anyone not already on a team or suspended | Creates a team, makes you its captain, gives you the **Captain** role |
| `/invite-player player:` | Team captains (team not full) | Privately invites a player — see below |
| `/team-invites` | Anyone | Shows **you** your own pending invites with Accept/Decline buttons (ephemeral — nobody else sees it) |
| `/leave-team` | Any non-captain player on a team | Leaves your current team |
| `/kick-player player:` | Team captains | Removes a player from your team, freeing a roster spot |
| `/disband-team` | The captain of a team | Deletes the team, removes everyone from it |
| `/suspend player: weeks:` | Users with the `suspend` permission | Kicks the player from their team and blocks them from joining/creating one for N weeks |
| `/weekly-match week:` | Users with the `weekly-match` permission | Randomly pairs every team into a match for the week and announces it publicly |
| `/log-match ...` | Users with the `log-match` permission | Posts a formatted match result publicly and records it for `/team` |
| `/team team_name:` | Anyone | Shows a team's captain, roster, win-loss record, and recent match results |
| `/player player:` | Anyone | Shows a player's current team, full team history, and suspension status if any |
| `/grant-perms permission: user:` | **Owner only** | Grants a user one of the staff permissions |
| `/remove-perms permission: user:` | **Owner only** | Revokes a staff permission from a user |

A player can only ever be on one team at a time — enforced in code at
every join point, not just convention. Teams are capped at
**`MAX_TEAM_SIZE`** players (default 6, captain included) — edit that in
`config.js` if your game's roster size differs.

## How invites work (private, no public spam)

1. A captain runs `/invite-player @someone`. This is **ephemeral** and
   only the captain sees the confirmation.
2. The bot also tries to DM the invited player as a courtesy heads-up
   (best effort — if their DMs are closed, this silently fails and
   doesn't block anything).
3. The invited player runs `/team-invites` themselves, which shows
   **only to them** (ephemeral) a list of their pending invites with
   Accept/Decline buttons.
4. Accepting or declining is never posted publicly. The **only** thing
   that shows up in the public team-log channel is the actual result:
   someone joining, leaving, or a team being created/disbanded. Nothing
   about invites being sent is ever logged publicly.

## Team name rules

- 2–32 characters, letters/numbers/spaces/hyphens/underscores only.
- Checked against `config/banned-words.json` — a basic profanity filter.
  Add or remove words there (including any slurs or region-specific
  terms you want blocked — we intentionally kept the shipped list to
  common general profanity, not an exhaustive list) and push to update
  it. Matching is a simple substring check, so it can occasionally
  false-positive on innocent words that merely contain a banned word
  (e.g. "assassins"); tighten `containsBannedWord()` in
  `utils/validation.js` if that becomes a real problem for you.

## The permission system (`/grant-perms` / `/remove-perms`)

There is exactly **one** hardcoded Discord ID in this whole project:
**yours**, as `OWNER_ID` in `config.js`. Set it once:

```js
OWNER_ID: '123456789012345678',
```

The owner automatically has every permission and is the only person who
can run `/grant-perms` and `/remove-perms`. Everything else is managed
live, through Discord, not by editing files:

- Run `/grant-perms permission:log-match user:@someone` to give them
  access to `/log-match`.
- Run `/remove-perms permission:log-match user:@someone` to take it away.
- The `permission` option is a dropdown with the current choices:
  `weekly-match`, `log-match`, `suspend`.

Grants are stored in `data/permissions.json` — inside your Railway
Volume, so they survive redeploys without you touching the repo at all.

If you want to add a new staff-gated command later, add its key to the
`PERMISSIONS` array at the top of `utils/permissionStore.js` and it will
automatically show up as a choice in both commands.

## How `/log-match` works

Built for a "best of 7, first to 4 wins" series format:

- `team1`, `team2`, and `week` are required.
- **Games 1–4 are required options**, games 5–7 are optional.
- For each game you enter both teams' scores; the bot determines the
  winner of each game itself and tallies the series — you never type
  the series score by hand.
- Results are saved to `data/matches.json`, which is what powers the
  win-loss record shown by `/team`.
- Different format? Adjust `MAX_GAMES` / `MIN_GAMES` at the top of
  `commands/log-match.js`.

Posts like this:

```
breeze vs Sens - Week 12
breeze 0 - 3 Sens
Sens wins!

Game 1: 0 - 6
Game 2: 0 - 6
Game 3: 0 - 6
```

## Suspensions

`/suspend @player weeks:2` immediately:
- Removes them from their current team (if any). If they're a captain,
  the whole team is disbanded (there's no one left to run it).
- Blocks them from `/create-team` or accepting any invite until the
  suspension expires — they'll be told exactly when via a Discord
  timestamp that displays in their own timezone.

Suspension status shows up in `/player` if it's currently active.

## Setup

### 1. Create the Discord application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new application.
2. Under **Bot**, click "Reset Token" and copy it — this is your `DISCORD_TOKEN`. Keep it secret.
3. Under **General Information**, copy the **Application ID** — this is your `CLIENT_ID`.
4. No privileged intents need to be enabled for this bot.

### 2. Invite the bot to your server

Under **OAuth2 > URL Generator**:
- Scopes: `bot`, `applications.commands`
- Bot permissions: `Manage Roles`, `View Channels`, `Send Messages`, `Embed Links`

Open the generated URL and add the bot to your server.

### 3. Get your IDs

With Developer Mode enabled (User Settings > Advanced > Developer Mode):
- Right-click your own name → Copy User ID → this goes in `config.js` as `OWNER_ID`.
- Right-click your server icon → Copy Server ID → this is `GUILD_ID`.
- Create (or pick) a channel for team activity logs, right-click it → Copy Channel ID → this is `TEAM_LOG_CHANNEL_ID`.
- Create (or pick) a channel for match results, right-click it → Copy Channel ID → this is `MATCH_LOG_CHANNEL_ID`.
  (These can be the same channel if you'd like everything in one place.)

Make sure the bot can view and send messages in both channels.

### 4. Set your owner ID

Open `config.js` and replace `YOUR_DISCORD_ID_HERE` with your own Discord user ID.

### 5. Configure environment variables

Copy `.env.example` to `.env` for local testing, or set the same
variables as Railway Variables for deployment (see below).

### 6. Run it locally (optional)

```bash
npm install
npm start
```

Slash commands register automatically on startup.

## Deploying to Railway

1. Push this repository to your own GitHub repo.
2. In Railway, create a new project → **Deploy from GitHub repo** → select your repo.
3. Under your service's **Variables** tab, add:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`
   - `TEAM_LOG_CHANNEL_ID`
   - `MATCH_LOG_CHANNEL_ID`
   - `DATA_DIR` — set this to `/data` (see next step)
4. **Add a Volume** (important!): Railway's filesystem is wiped on every
   redeploy. In your service settings, add a Volume and mount it at
   `/data`. This is where `teams.json`, `matches.json`,
   `player-history.json`, `invites.json`, `suspensions.json`, and
   `permissions.json` all live — without this volume, all of it (every
   team, every grant, every suspension) gets wiped on every push.
5. Deploy. Check the deploy logs for `Logged in as YourBot#1234` and
   `Registered N guild command(s)...` to confirm it started up correctly.

`config.js` and `config/banned-words.json` are part of your codebase,
not the volume — to update the owner ID or the word filter you edit
those files and push to GitHub, same as any code change. Staff
permissions, by contrast, are managed live via `/grant-perms` and
`/remove-perms` — no redeploy needed.

## Notes & troubleshooting

- **Role hierarchy**: the bot auto-creates a "Captain" role the first
  time someone runs `/create-team`. If assigning the role ever fails
  with a permissions error, make sure the bot's own role in Server
  Settings > Roles is positioned *above* the Captain role.
- **Single server only**: this bot is built for one Discord server.
  Team names and membership aren't scoped per-guild — if you ever want
  to run it in multiple servers, `utils/teamStore.js` is where you'd add
  per-guild scoping.
- All bot data is stored as plain JSON in `data/` — human-readable if
  you ever want to open a file directly and look.
