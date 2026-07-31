import initSqlJs, { type Database } from "sql.js"
import type { Logger } from "@/shared/logger"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { dirname } from "path"

export interface ConversationRecord {
  session_id: string
  workspace: string
  model: string
  mode: string
  agent: string
  title: string
  message_count: number
  updated_at: string
  pinned: boolean
  archived: boolean
}

export interface ConversationStoreAdapter {
  save(record: ConversationRecord): Promise<void>
  load(sessionId: string): Promise<ConversationRecord | null>
  list(workspace?: string): Promise<ConversationRecord[]>
  setTitle(sessionId: string, title: string): Promise<void>
  setFlags(sessionId: string, flags: { pinned?: boolean; archived?: boolean }): Promise<void>
}

export async function createConversationStore(dbPath: string, logger: Logger): Promise<ConversationStoreAdapter> {
  const log = logger.child({ component: "conversation-store" })
  mkdirSync(dirname(dbPath), { recursive: true })
  const SQL = await initSqlJs()

  let db: Database
  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      session_id TEXT PRIMARY KEY,
      workspace TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      mode TEXT NOT NULL DEFAULT 'interactive',
      agent TEXT NOT NULL DEFAULT 'cowork',
      title TEXT NOT NULL DEFAULT '',
      message_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      pinned INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0
    )
  `)
  persist()

  function persist(): void {
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(dbPath, buffer)
  }

  function rowToRecord(row: Record<string, unknown>): ConversationRecord {
    return {
      session_id: row.session_id as string,
      workspace: row.workspace as string,
      model: row.model as string,
      mode: row.mode as string,
      agent: row.agent as string,
      title: row.title as string,
      message_count: row.message_count as number,
      updated_at: row.updated_at as string,
      pinned: !!row.pinned,
      archived: !!row.archived,
    }
  }

  return {
    async save(record) {
      db.run(
        `INSERT OR REPLACE INTO conversations
         (session_id, workspace, model, mode, agent, title, message_count, updated_at, pinned, archived)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.session_id, record.workspace, record.model, record.mode,
          record.agent, record.title, record.message_count, record.updated_at,
          record.pinned ? 1 : 0, record.archived ? 1 : 0,
        ],
      )
      persist()
    },

    async load(sessionId) {
      const stmt = db.prepare("SELECT * FROM conversations WHERE session_id = ?")
      stmt.bind([sessionId])
      if (!stmt.step()) { stmt.free(); return null }
      const row = stmt.getAsObject() as Record<string, unknown>
      stmt.free()
      return rowToRecord(row)
    },

    async list(workspace) {
      const stmt = workspace
        ? db.prepare("SELECT * FROM conversations WHERE workspace = ? ORDER BY pinned DESC, updated_at DESC")
        : db.prepare("SELECT * FROM conversations ORDER BY pinned DESC, updated_at DESC")
      if (workspace) stmt.bind([workspace])

      const records: ConversationRecord[] = []
      while (stmt.step()) {
        records.push(rowToRecord(stmt.getAsObject() as Record<string, unknown>))
      }
      stmt.free()
      return records
    },

    async setTitle(sessionId, title) {
      db.run("UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE session_id = ?", [title, sessionId])
      persist()
    },

    async setFlags(sessionId, flags) {
      if (flags.pinned !== undefined) {
        db.run("UPDATE conversations SET pinned = ? WHERE session_id = ?", [flags.pinned ? 1 : 0, sessionId])
      }
      if (flags.archived !== undefined) {
        db.run("UPDATE conversations SET archived = ? WHERE session_id = ?", [flags.archived ? 1 : 0, sessionId])
      }
      persist()
    },
  }
}
