require('dotenv').config();

const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  Events,
} = require('discord.js');

const { handleInviteButton } = require('./handlers/inviteButtons');
const { DATA_DIR } = require('./utils/teamStore');

const REQUIRED_ENV = ['DISCORD_TOKEN', 'CLIENT_ID'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// No privileged gateway intents are needed — slash command option data
// (including invited users) and the invoking member arrive directly on
// the interaction itself.
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

const commandData = [];
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
  commandData.push(command.data.toJSON());
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    if (process.env.GUILD_ID) {
      // Guild commands update almost instantly — recommended while your
      // bot lives in a single server.
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commandData }
      );
      console.log(`Registered ${commandData.length} guild command(s) for guild ${process.env.GUILD_ID}.`);
    } else {
      // Global commands can take up to an hour to propagate.
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commandData });
      console.log(`Registered ${commandData.length} global command(s) (may take up to an hour to appear).`);
    }
  } catch (err) {
    console.error('Failed to register slash commands:', err);
  }
}

client.once(Events.ClientReady, async readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  console.log(`Team data is stored at: ${DATA_DIR}`);
  await registerCommands();
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
    } else if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command && command.autocomplete) {
        await command.autocomplete(interaction);
      }
    } else if (interaction.isButton() && interaction.customId.startsWith('invite::')) {
      await handleInviteButton(interaction);
    }
  } catch (err) {
    console.error('Error while handling interaction:', err);
    if (interaction.isRepliable && interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction
        .reply({ content: 'Something went wrong while processing that.', ephemeral: true })
        .catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('Failed to log in to Discord. Check that DISCORD_TOKEN is correct:', err.message || err);
  process.exit(1);
});
