import { DEFAULTS } from "./defaults"
import type { LogLevel } from "@/shared/logger"

export interface DaemonConfig {
  port: number
  host: string
  logLevel: LogLevel
  opencode: {
    port: number
    host: string
    healthIntervalMs: number
  }
  automation: {
    tickIntervalMs: number
  }
  inbox: {
    dbPath: string
  }
  conversations: {
    dbPath: string
  }
  secrets: {
    path: string
  }
  workspace: string
  stateDir: string
}

export function loadConfig(overrides: Partial<DaemonConfig> = {}): DaemonConfig {
  return {
    port: overrides.port ?? (Number(process.env.OS_PORT) || DEFAULTS.daemon.port),
    host: overrides.host ?? process.env.OS_HOST ?? DEFAULTS.daemon.host,
    logLevel: (overrides.logLevel ?? process.env.OS_LOG_LEVEL ?? DEFAULTS.daemon.logLevel) as LogLevel,
    opencode: {
      port: overrides.opencode?.port ?? (Number(process.env.OC_PORT) || DEFAULTS.opencode.port),
      host: overrides.opencode?.host ?? process.env.OC_HOST ?? DEFAULTS.opencode.host,
      healthIntervalMs: overrides.opencode?.healthIntervalMs ?? DEFAULTS.opencode.healthIntervalMs,
    },
    automation: {
      tickIntervalMs: overrides.automation?.tickIntervalMs ?? DEFAULTS.automation.tickIntervalMs,
    },
    inbox: {
      dbPath: overrides.inbox?.dbPath ?? process.env.OS_INBOX_DB ?? DEFAULTS.inbox.dbPath,
    },
    conversations: {
      dbPath: overrides.conversations?.dbPath ?? process.env.OS_CONV_DB ?? DEFAULTS.conversations.dbPath,
    },
    secrets: {
      path: overrides.secrets?.path ?? process.env.OS_SECRETS_PATH ?? DEFAULTS.secrets.path,
    },
    workspace: overrides.workspace ?? process.cwd(),
    stateDir: overrides.stateDir ?? process.env.OS_STATE_DIR ?? "~/.config/opensheeta",
  }
}
