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
import { createWelcomeImage } from "./welcome-image.js";

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
  const welcomeChannelId =
    settings.welcomeChannelId || config.welcomeChannelId;

  if (!welcomeChannelId || !config.welcomeImageUrl) return;

  const channel = member.guild.channels.cache.get(welcomeChannelId);
  if (!channel?.isTextBased()) return;

  try {
    const image = await createWelcomeImage({
      backgroundUrl: config.welcomeImageUrl,
      avatarUrl: member.user.displayAvatarURL({
        extension: "png",
        size: 256
      }),
      username: member.user.username
    });

    await channel.send({
      files: [
        {
          attachment: image,
          name: "welcome.png"
        }
      ]
    });
  } catch (error) {
    console.error("Welcome image failed:", error);
  }
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
