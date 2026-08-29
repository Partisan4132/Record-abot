import fs from "node:fs";
import path from "node:path";

const file = path.resolve("data", "store.json");
const empty = {
  guilds: {},
  moderation: []
};

function read() {
  fs.mkdirSync(path.dirname(file), { recursive: true });

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(empty, null, 2));
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return structuredClone(empty);
  }
}

function write(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function guildSettings(guildId) {
  const data = read();
  return data.guilds[guildId] || {};
}

export function saveGuildSettings(guildId, patch) {
  const data = read();
  data.guilds[guildId] = {
    ...data.guilds[guildId],
    ...patch
  };
  write(data);
  return data.guilds[guildId];
}

export function addModeration(record) {
  const data = read();
  data.moderation.unshift({
    ...record,
    at: new Date().toISOString()
  });
  write(data);
}
