import initSqlJs, { type Database } from "sql.js"
import type { Logger } from "@/shared/logger"
import type { OWInboxItem } from "@/types/openworker"
import { readFileSync, writeFileSync, existsSync } from "fs"

export interface InboxStoreAdapter {
  addItem(item: Omit<OWInboxItem, "id" | "created_at" | "state" | "resolution" | "resolved_at">): Promise<OWInboxItem>
  getItem(id: string): Promise<OWInboxItem | null>
  listPending(sessionId?: string): Promise<OWInboxItem[]>
  resolve(id: string, resolution: string): Promise<boolean>
  waitForResolution(id: string, timeoutMs?: number): Promise<string | null>
}

export async function createInboxStore(dbPath: string, logger: Logger): Promise<InboxStoreAdapter> {
  const log = logger.child({ component: "inbox-store" })
  const SQL = await initSqlJs()

  let db: Database
  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS inbox (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      state TEXT DEFAULT 'pending',
      resolution TEXT,
      visibility TEXT DEFAULT 'inbox',
      tool_call_id TEXT,
      data TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    )
  `)
  persist()

  const waiters = new Map<string, Array<(resolution: string) => void>>()

  function persist(): void {
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(dbPath, buffer)
  }

  function generateId(): string {
    return `inbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  function rowToItem(row: Record<string, unknown>): OWInboxItem {
    return {
      id: row.id as string,
      session_id: row.session_id as string,
      kind: row.kind as OWInboxItem["kind"],
      title: row.title as string,
      body: (row.body as string) ?? "",
      state: row.state as OWInboxItem["state"],
      resolution: (row.resolution as string) ?? null,
      visibility: row.visibility as OWInboxItem["visibility"],
      created_at: row.created_at as string,
      resolved_at: (row.resolved_at as string) ?? null,
      tool_call_id: (row.tool_call_id as string) ?? undefined,
      data: row.data ? JSON.parse(row.data as string) : undefined,
    }
  }

  function getItem(id: string): OWInboxItem | null {
    const stmt = db.prepare("SELECT * FROM inbox WHERE id = ?")
    stmt.bind([id])
    if (!stmt.step()) { stmt.free(); return null }
    const row = stmt.getAsObject() as Record<string, unknown>
    stmt.free()
    return rowToItem(row)
  }

  return {
    async addItem(item) {
      const id = generateId()
      const now = new Date().toISOString()
      db.run(
        `INSERT INTO inbox (id, session_id, kind, title, body, state, visibility, tool_call_id, data, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
        [
          id, item.session_id, item.kind, item.title, item.body,
          item.visibility, item.tool_call_id ?? null,
          item.data ? JSON.stringify(item.data) : null, now,
        ],
      )
      persist()
      log.info("Inbox item created", { id, kind: item.kind, sessionId: item.session_id })
      return { ...item, id, created_at: now, state: "pending" as const, resolution: null, resolved_at: null }
    },

    async getItem(id) {
      return getItem(id)
    },

    async listPending(sessionId) {
      const stmt = sessionId
        ? db.prepare("SELECT * FROM inbox WHERE state = 'pending' AND session_id = ?")
        : db.prepare("SELECT * FROM inbox WHERE state = 'pending'")
      if (sessionId) stmt.bind([sessionId])

      const items: OWInboxItem[] = []
      while (stmt.step()) {
        items.push(rowToItem(stmt.getAsObject() as Record<string, unknown>))
      }
      stmt.free()
      return items
    },

    async resolve(id, resolution) {
      const now = new Date().toISOString()
      db.run(
        `UPDATE inbox SET state = 'resolved', resolution = ?, resolved_at = ?
         WHERE id = ? AND state = 'pending'`,
        [resolution, now, id],
      )
      persist()

      const changes = db.getRowsModified()
      if (changes > 0) {
        log.info("Inbox item resolved", { id, resolution })
        const callbacks = waiters.get(id)
        if (callbacks) {
          for (const cb of callbacks) cb(resolution)
          waiters.delete(id)
        }
        return true
      }
      return false
    },

    async waitForResolution(id, timeoutMs = 300_000) {
      const existing = await getItem(id)
      if (existing?.state === "resolved") return existing.resolution

      return new Promise<string | null>((resolve) => {
        if (!waiters.has(id)) waiters.set(id, [])
        waiters.get(id)!.push(resolve)

        setTimeout(() => {
          const cbs = waiters.get(id)
          if (cbs) {
            const idx = cbs.indexOf(resolve)
            if (idx >= 0) cbs.splice(idx, 1)
          }
          resolve(null)
        }, timeoutMs)
      })
    },
  }
}
