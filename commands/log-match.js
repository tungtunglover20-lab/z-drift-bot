const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { loadTeams } = require('../utils/teamStore');
const { postMatchLog } = require('../utils/logger');

// How many games a series can go, and how many are mandatory to submit
// the command. Change these (and the loop bounds below) if your league's
// series format isn't "best of 7, minimum 4 to decide it".
const MAX_GAMES = 7;
const MIN_GAMES = 4;

function addGameOptions(builder, gameNum, required) {
  return builder
    .addIntegerOption(opt =>
      opt
        .setName(`g${gameNum}_team1`)
        .setDescription(`Team 1's score in game ${gameNum}`)
        .setRequired(required)
        .setMinValue(0)
    )
    .addIntegerOption(opt =>
      opt
        .setName(`g${gameNum}_team2`)
        .setDescription(`Team 2's score in game ${gameNum}`)
        .setRequired(required)
        .setMinValue(0)
    );
}

const builder = new SlashCommandBuilder()
  .setName('log-match')
  .setDescription('Log a completed match result to the public match log (staff only).')
  .setDMPermission(false)
  .addStringOption(opt =>
    opt.setName('team1').setDescription('Name of team 1').setRequired(true).setAutocomplete(true)
  )
  .addStringOption(opt =>
    opt.setName('team2').setDescription('Name of team 2').setRequired(true).setAutocomplete(true)
  )
  .addIntegerOption(opt =>
    opt.setName('week').setDescription('Week number').setRequired(true).setMinValue(1)
  );

// Required options must come before optional ones on the same command.
for (let i = 1; i <= MIN_GAMES; i++) addGameOptions(builder, i, true);
for (let i = MIN_GAMES + 1; i <= MAX_GAMES; i++) addGameOptions(builder, i, false);

module.exports = {
  data: builder,

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const teams = await loadTeams();
    const matches = Object.keys(teams)
      .filter(name => name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map(name => ({ name, value: name }));
    await interaction.respond(matches);
  },

  async execute(interaction) {
    if (!config.AUTHORIZED_LOGGERS.includes(interaction.user.id)) {
      return interaction.reply({
        content: "You're not authorized to use this command.",
        ephemeral: true,
      });
    }

    const team1 = interaction.options.getString('team1').trim();
    const team2 = interaction.options.getString('team2').trim();
    const week = interaction.options.getInteger('week');

    if (team1.toLowerCase() === team2.toLowerCase()) {
      return interaction.reply({ content: "A team can't play itself.", ephemeral: true });
    }

    const games = [];
    for (let i = 1; i <= MAX_GAMES; i++) {
      const s1 = interaction.options.getInteger(`g${i}_team1`);
      const s2 = interaction.options.getInteger(`g${i}_team2`);
      if (s1 === null || s2 === null) continue; // this optional game wasn't filled in

      if (s1 === s2) {
        return interaction.reply({
          content: `Game ${i} can't end in a tie (${s1} - ${s2}). Please fix the scores.`,
          ephemeral: true,
        });
      }
      games.push({ number: i, s1, s2 });
    }

    if (games.length < MIN_GAMES) {
      return interaction.reply({
        content: `You must enter at least ${MIN_GAMES} games.`,
        ephemeral: true,
      });
    }

    let team1Wins = 0;
    let team2Wins = 0;
    for (const g of games) {
      if (g.s1 > g.s2) team1Wins++;
      else team2Wins++;
    }

    if (team1Wins === team2Wins) {
      return interaction.reply({
        content: `The series is tied ${team1Wins}-${team2Wins} — a series needs a clear winner. Add more games or double-check the scores.`,
        ephemeral: true,
      });
    }

    const winner = team1Wins > team2Wins ? team1 : team2;

    const gamesText = games.map(g => `Game ${g.number}: ${g.s1} - ${g.s2}`).join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`${team1} vs ${team2} - Week ${week}`)
      .setColor(0xed4245)
      .setDescription(
        `**${team1} ${team1Wins} - ${team2Wins} ${team2}**\n🏆 ${winner} wins!\n\n${gamesText}`
      )
      .setTimestamp();

    await postMatchLog(interaction.client, { embeds: [embed] });

    // Give a heads-up if a team name doesn't match a currently registered team
    // (typo, or an exhibition/historical match) — doesn't block logging.
    const teams = await loadTeams();
    const registeredLower = Object.keys(teams).map(n => n.toLowerCase());
    const unregistered = [team1, team2].filter(t => !registeredLower.includes(t.toLowerCase()));
    const warning = unregistered.length
      ? `\n\n⚠️ Note: not currently a registered team: ${unregistered.map(t => `**${t}**`).join(', ')}.`
      : '';

    await interaction.reply({ content: `Match result logged!${warning}`, ephemeral: true });
  },
};
