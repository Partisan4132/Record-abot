import "dotenv/config";

const required = [
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_GUILD_ID"
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || "",
  welcomeMessage:
    process.env.WELCOME_MESSAGE || "Welcome {user} to {server}!"
};
