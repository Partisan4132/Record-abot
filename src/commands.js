import {
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import {
  addModeration,
  guildSettings
} from "./store.js";

const administrator = PermissionFlagsBits.Administrator.toString();

export const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether the bot is online."),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.KickMembers.toString()
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member to kick")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("reason").setDescription("Reason")
    ),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers.toString()
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member to ban")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("reason").setDescription("Reason")
    ),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete recent messages.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages.toString()
    )
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("1 to 100")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("addrole")
    .setDescription("Add a role to a member.")
    .setDefaultMemberPermissions(administrator)
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member")
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName("role")
        .setDescription("Role to add")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("removerole")
    .setDescription("Remove a role from a member.")
    .setDefaultMemberPermissions(administrator)
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member")
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName("role")
        .setDescription("Role to remove")
        .setRequired(true)
    )
].map(command => command.toJSON());

function hasAdministratorPermission(interaction) {
  return interaction.member.permissions.has(
    PermissionFlagsBits.Administrator
  );
}

function canManageRole(interaction, role) {
  const botMember = interaction.guild.members.me;

  return Boolean(
    role &&
      botMember &&
      !role.managed &&
      role.position < botMember.roles.highest.position &&
      role.position < interaction.member.roles.highest.position
  );
}

export async function handleCommand(interaction) {
  if (!interaction.guildId) {
    return interaction.reply({
      content: "Use this command inside a server.",
      ephemeral: true
    });
  }

  if (interaction.commandName === "ping") {
    return interaction.reply({
      content: "Pong — online.",
      ephemeral: true
    });
  }

  if (["addrole", "removerole"].includes(interaction.commandName)) {
    if (!hasAdministratorPermission(interaction)) {
      return interaction.reply({
        content: "Only administrators can use this command.",
        ephemeral: true
      });
    }

    const member = interaction.options.getMember("user");
    const role = interaction.options.getRole("role");

    if (!member || !role) {
      return interaction.reply({
        content: "The user or role could not be found.",
        ephemeral: true
      });
    }

    if (!canManageRole(interaction, role)) {
      return interaction.reply({
        content:
          "I cannot manage that role. Move it below my highest role and make sure it is not integration-managed.",
        ephemeral: true
      });
    }

    if (interaction.commandName === "addrole") {
      await member.roles.add(role);
    } else {
      await member.roles.remove(role);
    }

    addModeration({
      guildId: interaction.guildId,
      action: interaction.commandName,
      moderator: interaction.user.tag,
      target: member.user.tag,
      role: role.name
    });

    return interaction.reply({
      content: `${
        interaction.commandName === "addrole" ? "Added" : "Removed"
      } **${role.name}** ${
        interaction.commandName === "addrole" ? "to" : "from"
      } **${member.user.tag}**.`,
      ephemeral: true
    });
  }

  if (["kick", "ban"].includes(interaction.commandName)) {
    const permission =
      interaction.commandName === "kick"
        ? PermissionFlagsBits.KickMembers
        : PermissionFlagsBits.BanMembers;

    if (!interaction.member.permissions.has(permission)) {
      return interaction.reply({
        content: "You do not have the required permission.",
        ephemeral: true
      });
    }

    const member = interaction.options.getMember("user");
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    if (!member || member.id === interaction.user.id) {
      return interaction.reply({
        content: "Choose another member.",
        ephemeral: true
      });
    }

    if (
      member.roles.highest.position >=
        interaction.member.roles.highest.position ||
      !member.manageable
    ) {
      return interaction.reply({
        content: "That member cannot be managed because of role hierarchy.",
        ephemeral: true
      });
    }

    if (interaction.commandName === "kick") {
      await member.kick(reason);
    } else {
      await member.ban({ reason });
    }

    addModeration({
      guildId: interaction.guildId,
      action: interaction.commandName,
      moderator: interaction.user.tag,
      target: member.user.tag,
      reason
    });

    return interaction.reply({
      content: `${interaction.commandName} completed for **${member.user.tag}**.`,
      ephemeral: true
    });
  }

  if (interaction.commandName === "purge") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: "You do not have the required permission.",
        ephemeral: true
      });
    }

    const amount = interaction.options.getInteger("amount");

    if (!interaction.channel?.bulkDelete) {
      return interaction.reply({
        content: "This channel does not support purge.",
        ephemeral: true
      });
    }

    await interaction.channel.bulkDelete(amount, true);

    return interaction.reply({
      content: `Deleted ${amount} messages.`,
      ephemeral: true
    });
  }
}
