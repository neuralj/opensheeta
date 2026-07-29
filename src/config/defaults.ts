export const DEFAULTS = {
  daemon: {
    port: 8765,
    host: "0.0.0.0",
    logLevel: "info" as const,
  },
  opencode: {
    port: 4096,
    host: "127.0.0.1",
    healthIntervalMs: 30_000,
  },
  automation: {
    tickIntervalMs: 30_000,
  },
  cooldown: {
    pingIntervalMs: 840_000,
  },
  inbox: {
    dbPath: "inbox.db",
  },
  conversations: {
    dbPath: "conversations.db",
  },
  tasks: {
    dbPath: "tasks.db",
  },
  secrets: {
    path: "~/.config/opensheeta/secrets.json",
  },
} as const
