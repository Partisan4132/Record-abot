import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes
} from "discord.js";
import { commands, handleCommand } from "./commands.js";
import { config } from "./config.js";
import { guildSettings } from "./store.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.once(Events.ClientReady, ready => {
  console.log(`Logged in as ${ready.user.tag}`);
});

client.on(Events.InteractionCreate, interaction => {
  if (!interaction.isChatInputCommand()) return;

  handleCommand(interaction).catch(error => {
    console.error(error);

    if (!interaction.replied && !interaction.deferred) {
      interaction
        .reply({
          content: "The command failed. Check the bot permissions and logs.",
          ephemeral: true
        })
        .catch(() => {});
    }
  });
});

client.on(Events.GuildMemberAdd, async member => {
  const settings = guildSettings(member.guild.id);

  if (!settings.welcomeChannelId) return;

  const channel = member.guild.channels.cache.get(
    settings.welcomeChannelId
  );

  if (!channel?.isTextBased()) return;

  await channel
    .send(
      (settings.welcomeMessage || config.welcomeMessage)
        .replace("{user}", `<@${member.id}>`)
        .replace("{server}", member.guild.name)
    )
    .catch(() => {});
});

const rest = new REST({ version: "10" }).setToken(config.token);

await rest.put(
  Routes.applicationGuildCommands(config.clientId, config.guildId),
  { body: commands }
);

await client.login(config.token);

const shutdown = signal => {
  console.log(`${signal}: shutting down`);
  client.destroy();
  process.exit(0);
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
