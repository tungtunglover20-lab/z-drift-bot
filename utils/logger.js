// Sends messages to the public log channels, configured via environment
// variables (TEAM_LOG_CHANNEL_ID and MATCH_LOG_CHANNEL_ID). These can be
// the same channel if you want everything in one place.

async function postToChannel(client, channelId, payload) {
  if (!channelId) {
    console.error('Missing channel ID env var for a log message — check TEAM_LOG_CHANNEL_ID / MATCH_LOG_CHANNEL_ID.');
    return null;
  }
  try {
    const channel = await client.channels.fetch(channelId);
    return await channel.send(payload);
  } catch (err) {
    console.error(`Failed to send message to channel ${channelId}:`, err);
    return null;
  }
}

// content: a plain string
async function postTeamLog(client, content) {
  return postToChannel(client, process.env.TEAM_LOG_CHANNEL_ID, { content });
}

// payload: a plain string OR a full message payload (e.g. { embeds: [...] })
async function postMatchLog(client, payload) {
  const data = typeof payload === 'string' ? { content: payload } : payload;
  return postToChannel(client, process.env.MATCH_LOG_CHANNEL_ID, data);
}

module.exports = { postToChannel, postTeamLog, postMatchLog };
