# Discord Team Bot

A Discord bot for running a competitive game server: teams, invites, weekly
matchups, and public match-result logging.

## Commands

| Command | Who can use it | What it does |
|---|---|---|
| `/create-team team_name:` | Anyone not already on a team | Creates a team, makes you its captain, gives you the **Captain** role |
| `/invite-player player:` | Team captains | Sends the mentioned player an Accept/Decline invite to your team |
| `/leave-team` | Any player on a team (non-captains) | Leaves your current team |
| `/disband-team` | The captain of a team | Deletes the team and removes it from the log |
| `/weekly-match week:` | Users listed in `config/authorized-schedulers.json` | Randomly pairs every team into a match for the week and announces it publicly |
| `/log-match ...` | Users listed in `config.js` (`AUTHORIZED_LOGGERS`) | Posts a formatted match result to the public match-log channel |

A player can only ever be on one team at a time — this is enforced in code
at every join point (`/create-team`, `/invite-player`, and accepting an
invite), not just by convention.

Every create / join / leave / disband event is also posted automatically
to a public log channel you configure (see below).

## How `/log-match` works

It's built for a "best of 7, first to 4 wins" series format:

- `team1`, `team2`, and `week` are required.
- **Games 1–4 are required options**, games 5–7 are optional — matching
  "you need at least 4 games, but a series can run up to 7."
- For each game you enter both teams' scores (e.g. round score on a map).
  The bot figures out who won each game itself (higher score wins) and
  tallies the series score and overall winner — you don't need to type
  the series score by hand.
- If your league uses a different format (e.g. best of 5), open
  `commands/log-match.js` and change the `MAX_GAMES` / `MIN_GAMES`
  constants at the top of the file.

It posts like this:

```
breeze vs Sens - Week 12
breeze 0 - 3 Sens
Sens wins!

Game 1: 0 - 6
Game 2: 0 - 6
Game 3: 0 - 6
```

## Where to add your whitelists

- **`/weekly-match` access** → edit `config/authorized-schedulers.json`.
  Add each authorized Discord user ID as a string:
  ```json
  ["123456789012345678", "234567890123456789"]
  ```
- **`/log-match` access** → edit `config.js`, and add IDs to the
  `AUTHORIZED_LOGGERS` array:
  ```js
  AUTHORIZED_LOGGERS: ['123456789012345678', '234567890123456789'],
  ```

To get a Discord user ID: enable Developer Mode (User Settings > Advanced
> Developer Mode), then right-click a user and choose "Copy User ID".

After editing either file, commit and push — Railway will automatically
redeploy with your changes.

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

With Developer Mode enabled:
- Right-click your server icon → Copy Server ID → this is `GUILD_ID`.
- Create (or pick) a channel for team activity logs, right-click it → Copy Channel ID → this is `TEAM_LOG_CHANNEL_ID`.
- Create (or pick) a channel for match results, right-click it → Copy Channel ID → this is `MATCH_LOG_CHANNEL_ID`.
  (These can be the same channel if you'd like everything in one place.)

Make sure the bot can view and send messages in both channels.

### 4. Configure environment variables

Copy `.env.example` to `.env` for local testing, or set the same
variables as Railway Variables for deployment (see below).

### 5. Run it locally (optional)

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
   `/data`. This is where `teams.json` will live, so your team roster
   survives redeploys and restarts. Without this, everyone's teams get
   wiped every time you push a code change.
5. Deploy. Check the deploy logs for `Logged in as YourBot#1234` and
   `Registered N guild command(s)...` to confirm it started up and
   registered commands correctly.

Everything else (`config.js` and `config/authorized-schedulers.json`) is
part of your codebase, not the volume — to update those whitelists you
edit the files and push to GitHub as described above.

## Notes & troubleshooting

- **Role hierarchy**: the bot auto-creates a "Captain" role the first
  time someone runs `/create-team`. If assigning the role ever fails
  with a permissions error, make sure the bot's own role in Server
  Settings > Roles is positioned *above* the Captain role.
- **Single server only**: this bot is built for one Discord server.
  Team names and membership aren't scoped per-guild — if you ever want
  to run it in multiple servers, `utils/teamStore.js` is where you'd add
  per-guild scoping.
- Team data is stored as JSON in `data/teams.json` (a plain text file —
  you can open it directly to see every team, its captain, and its
  roster).
