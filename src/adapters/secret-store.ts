import { readFileSync, writeFileSync, existsSync, chmodSync } from "fs"
import { resolve } from "path"
import { homedir } from "os"
import type { Logger } from "@/shared/logger"

export interface SecretStore {
  get(profile: string): Record<string, unknown> | null
  put(profile: string, data: Record<string, unknown>): void
  delete(profile: string): void
  status(): Array<{ profile: string; keys: string[] }>
}

export function createSecretStore(path: string, logger: Logger): SecretStore {
  const log = logger.child({ component: "secret-store" })
  const resolvedPath = resolve(path.replace("~", homedir()))

  function load(): Record<string, Record<string, unknown>> {
    if (!existsSync(resolvedPath)) return {}
    try {
      return JSON.parse(readFileSync(resolvedPath, "utf-8"))
    } catch (err) {
      log.error("Failed to read secrets file", { path: resolvedPath, error: String(err) })
      return {}
    }
  }

  function save(data: Record<string, Record<string, unknown>>): void {
    writeFileSync(resolvedPath, JSON.stringify(data, null, 2), { mode: 0o600 })
    try { chmodSync(resolvedPath, 0o600) } catch { /* best effort */ }
  }

  return {
    get(profile) {
      const all = load()
      return all[profile] ?? null
    },
    put(profile, data) {
      const all = load()
      all[profile] = data
      save(all)
      log.info("Secret saved", { profile })
    },
    delete(profile) {
      const all = load()
      delete all[profile]
      save(all)
      log.info("Secret deleted", { profile })
    },
    status() {
      const all = load()
      return Object.entries(all).map(([profile, data]) => ({
        profile,
        keys: Object.keys(data),
      }))
    },
  }
}
