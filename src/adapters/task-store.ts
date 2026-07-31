import initSqlJs, { type Database } from "sql.js"
import type { Logger } from "@/shared/logger"
import type { TaskRecord, TaskStatus, PipelineRecord, PipelineStage, RecurringRecord } from "@/types/task"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { dirname } from "path"

export interface TaskStoreAdapter {
  enqueue(task: TaskRecord): Promise<void>
  getTask(id: string): Promise<TaskRecord | null>
  peekPending(): Promise<TaskRecord | null>
  listTasks(filter?: { status?: string; pipeline_id?: string }): Promise<TaskRecord[]>
  updateTask(id: string, patch: Partial<TaskRecord>): Promise<void>
  markRunning(id: string): Promise<void>
  markCompleted(id: string): Promise<void>
  markRetry(id: string): Promise<void>
  markFailed(id: string, reason: string): Promise<void>

  addPipeline(pl: PipelineRecord): Promise<void>
  getPipeline(id: string): Promise<PipelineRecord | null>
  listPipelines(): Promise<PipelineRecord[]>
  updatePipeline(id: string, patch: Partial<PipelineRecord>): Promise<void>
  removePipeline(id: string): Promise<void>
  addStage(stage: PipelineStage): Promise<void>
  getStages(pipelineId: string): Promise<PipelineStage[]>
  updateStage(stageId: string, patch: Partial<PipelineStage>): Promise<void>

  addRecurring(r: RecurringRecord): Promise<void>
  listRecurring(): Promise<RecurringRecord[]>
  getRecurring(id: string): Promise<RecurringRecord | null>
  updateRecurring(id: string, patch: Partial<RecurringRecord>): Promise<void>
  removeRecurring(id: string): Promise<void>
}

export async function createTaskStore(dbPath: string, logger: Logger): Promise<TaskStoreAdapter> {
  const log = logger.child({ component: "task-store" })
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
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      directory TEXT NOT NULL DEFAULT '',
      prompt TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      agent_id TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      pipeline_id TEXT,
      error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS pipelines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      directory TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      current_stage INTEGER NOT NULL DEFAULT 0,
      session_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS pipeline_stages (
      id TEXT PRIMARY KEY,
      pipeline_id TEXT NOT NULL REFERENCES pipelines(id),
      stage_index INTEGER NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      prompt TEXT NOT NULL,
      model TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      task_id TEXT,
      error TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS recurring (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      directory TEXT NOT NULL DEFAULT '',
      prompt TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT '',
      cron TEXT NOT NULL,
      timezone TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run_at INTEGER
    )
  `)
  persist()

  // Migration: add task chain columns if not present
  const colStmt = db.prepare("PRAGMA table_info(tasks)")
  const columns = new Set<string>()
  while (colStmt.step()) {
    const row = colStmt.getAsObject() as Record<string, unknown>
    columns.add(row.name as string)
  }
  colStmt.free()

  if (!columns.has("on_success")) {
    db.run("ALTER TABLE tasks ADD COLUMN on_success TEXT")
  }
  if (!columns.has("on_failure")) {
    db.run("ALTER TABLE tasks ADD COLUMN on_failure TEXT")
  }
  if (!columns.has("chain_depth")) {
    db.run("ALTER TABLE tasks ADD COLUMN chain_depth INTEGER DEFAULT 0")
  }
  if (!columns.has("max_chain_depth")) {
    db.run("ALTER TABLE tasks ADD COLUMN max_chain_depth INTEGER DEFAULT 10")
  }
  if (!columns.has("parent_task_id")) {
    db.run("ALTER TABLE tasks ADD COLUMN parent_task_id TEXT")
  }
  persist()

  function persist(): void {
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(dbPath, buffer)
  }

  function rowToTask(row: Record<string, unknown>): TaskRecord {
    return {
      id: row.id as string,
      directory: (row.directory as string) ?? "",
      prompt: row.prompt as string,
      model: (row.model as string) ?? "",
      status: row.status as TaskStatus,
      agent_id: (row.agent_id as string) ?? undefined,
      attempts: row.attempts as number,
      max_attempts: row.max_attempts as number,
      pipeline_id: (row.pipeline_id as string) ?? undefined,
      error: (row.error as string) ?? undefined,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
      on_success: (row.on_success as string) ?? undefined,
      on_failure: (row.on_failure as string) ?? undefined,
      chain_depth: (row.chain_depth as number) ?? 0,
      max_chain_depth: (row.max_chain_depth as number) ?? 10,
      parent_task_id: (row.parent_task_id as string) ?? undefined,
    }
  }

  function rowToPipeline(row: Record<string, unknown>): PipelineRecord {
    return {
      id: row.id as string,
      name: row.name as string,
      directory: (row.directory as string) ?? "",
      status: row.status as PipelineRecord["status"],
      current_stage: row.current_stage as number,
      session_id: (row.session_id as string) ?? undefined,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    }
  }

  function rowToStage(row: Record<string, unknown>): PipelineStage {
    return {
      id: row.id as string,
      pipeline_id: row.pipeline_id as string,
      stage_index: row.stage_index as number,
      label: (row.label as string) ?? "",
      prompt: row.prompt as string,
      model: (row.model as string) ?? undefined,
      status: row.status as PipelineStage["status"],
      task_id: (row.task_id as string) ?? undefined,
      error: (row.error as string) ?? undefined,
    }
  }

  function rowToRecurring(row: Record<string, unknown>): RecurringRecord {
    return {
      id: row.id as string,
      name: row.name as string,
      directory: (row.directory as string) ?? "",
      prompt: row.prompt as string,
      model: (row.model as string) ?? "",
      cron: row.cron as string,
      timezone: (row.timezone as string) ?? undefined,
      enabled: !!row.enabled,
      last_run_at: (row.last_run_at as number) ?? undefined,
    }
  }

  function getTaskRow(id: string): Record<string, unknown> | null {
    const stmt = db.prepare("SELECT * FROM tasks WHERE id = ?")
    stmt.bind([id])
    if (!stmt.step()) { stmt.free(); return null }
    const row = stmt.getAsObject() as Record<string, unknown>
    stmt.free()
    return row
  }

  return {
    async enqueue(task) {
      db.run(
        `INSERT INTO tasks (id, directory, prompt, model, status, agent_id, attempts, max_attempts, pipeline_id, error, created_at, updated_at, on_success, on_failure, chain_depth, max_chain_depth, parent_task_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [task.id, task.directory, task.prompt, task.model, task.status,
         task.agent_id ?? null, task.attempts, task.max_attempts,
         task.pipeline_id ?? null, task.error ?? null, task.created_at, task.updated_at,
         task.on_success ?? null, task.on_failure ?? null,
         task.chain_depth ?? 0, task.max_chain_depth ?? 10,
         task.parent_task_id ?? null],
      )
      persist()
      log.debug("Task enqueued", { id: task.id })
    },

    async getTask(id) {
      const stmt = db.prepare("SELECT * FROM tasks WHERE id = ?")
      stmt.bind([id])
      if (!stmt.step()) { stmt.free(); return null }
      const row = stmt.getAsObject() as Record<string, unknown>
      stmt.free()
      return rowToTask(row)
    },

    async peekPending() {
      const stmt = db.prepare("SELECT * FROM tasks WHERE status = 'pending' ORDER BY created_at LIMIT 1")
      if (!stmt.step()) { stmt.free(); return null }
      const row = stmt.getAsObject() as Record<string, unknown>
      stmt.free()
      return rowToTask(row)
    },

    async listTasks(filter) {
      let sql = "SELECT * FROM tasks"
      const conditions: string[] = []
      const params: unknown[] = []
      if (filter?.status) { conditions.push("status = ?"); params.push(filter.status) }
      if (filter?.pipeline_id) { conditions.push("pipeline_id = ?"); params.push(filter.pipeline_id) }
      if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ")
      sql += " ORDER BY created_at"

      const stmt = params.length > 0 ? db.prepare(sql) : db.prepare(sql)
      if (params.length > 0) stmt.bind(params)
      const tasks: TaskRecord[] = []
      while (stmt.step()) {
        tasks.push(rowToTask(stmt.getAsObject() as Record<string, unknown>))
      }
      stmt.free()
      return tasks
    },

    async updateTask(id, patch) {
      const sets: string[] = []
      const params: unknown[] = []
      for (const [key, value] of Object.entries(patch)) {
        const col = key === "agent_id" ? "agent_id"
          : key === "pipeline_id" ? "pipeline_id"
          : key === "max_attempts" ? "max_attempts"
          : key === "created_at" ? "created_at"
          : key === "updated_at" ? "updated_at"
          : key
        sets.push(`${col} = ?`)
        params.push(value ?? null)
      }
      if (sets.length === 0) return
      sets.push("updated_at = ?")
      params.push(Date.now())
      params.push(id)
      db.run(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`, params)
      persist()
    },

    async markRunning(id) {
      const row = getTaskRow(id)
      if (!row) return
      const task = rowToTask(row)
      db.run(
        "UPDATE tasks SET status = 'running', attempts = attempts + 1, updated_at = ? WHERE id = ?",
        [Date.now(), id],
      )
      persist()
    },

    async markCompleted(id) {
      db.run(
        "UPDATE tasks SET status = 'completed', updated_at = ? WHERE id = ?",
        [Date.now(), id],
      )
      persist()
    },

    async markRetry(id) {
      db.run(
        "UPDATE tasks SET status = 'pending', error = NULL, updated_at = ? WHERE id = ?",
        [Date.now(), id],
      )
      persist()
    },

    async markFailed(id, reason) {
      const row = getTaskRow(id)
      if (!row) return
      const task = rowToTask(row)
      const status: TaskStatus = task.attempts >= task.max_attempts ? "failed" : "pending"
      db.run(
        "UPDATE tasks SET status = ?, error = ?, updated_at = ? WHERE id = ?",
        [status, reason, Date.now(), id],
      )
      persist()
    },

    async addPipeline(pl) {
      db.run(
        `INSERT INTO pipelines (id, name, directory, status, current_stage, session_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [pl.id, pl.name, pl.directory, pl.status, pl.current_stage,
         pl.session_id ?? null, pl.created_at, pl.updated_at],
      )
      persist()
    },

    async getPipeline(id) {
      const stmt = db.prepare("SELECT * FROM pipelines WHERE id = ?")
      stmt.bind([id])
      if (!stmt.step()) { stmt.free(); return null }
      const row = stmt.getAsObject() as Record<string, unknown>
      stmt.free()
      return rowToPipeline(row)
    },

    async listPipelines() {
      const stmt = db.prepare("SELECT * FROM pipelines ORDER BY created_at DESC")
      const pipelines: PipelineRecord[] = []
      while (stmt.step()) {
        pipelines.push(rowToPipeline(stmt.getAsObject() as Record<string, unknown>))
      }
      stmt.free()
      return pipelines
    },

    async updatePipeline(id, patch) {
      const sets: string[] = []
      const params: unknown[] = []
      for (const [key, value] of Object.entries(patch)) {
        const col = key === "current_stage" ? "current_stage"
          : key === "session_id" ? "session_id"
          : key === "created_at" ? "created_at"
          : key === "updated_at" ? "updated_at"
          : key
        sets.push(`${col} = ?`)
        params.push(value ?? null)
      }
      if (sets.length === 0) return
      sets.push("updated_at = ?")
      params.push(Date.now())
      params.push(id)
      db.run(`UPDATE pipelines SET ${sets.join(", ")} WHERE id = ?`, params)
      persist()
    },

    async removePipeline(id) {
      db.run("DELETE FROM pipeline_stages WHERE pipeline_id = ?", [id])
      db.run("DELETE FROM pipelines WHERE id = ?", [id])
      persist()
    },

    async addStage(stage) {
      db.run(
        `INSERT INTO pipeline_stages (id, pipeline_id, stage_index, label, prompt, model, status, task_id, error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [stage.id, stage.pipeline_id, stage.stage_index, stage.label, stage.prompt,
         stage.model ?? null, stage.status, stage.task_id ?? null, stage.error ?? null],
      )
      persist()
    },

    async getStages(pipelineId) {
      const stmt = db.prepare("SELECT * FROM pipeline_stages WHERE pipeline_id = ? ORDER BY stage_index")
      stmt.bind([pipelineId])
      const stages: PipelineStage[] = []
      while (stmt.step()) {
        stages.push(rowToStage(stmt.getAsObject() as Record<string, unknown>))
      }
      stmt.free()
      return stages
    },

    async updateStage(stageId, patch) {
      const sets: string[] = []
      const params: unknown[] = []
      for (const [key, value] of Object.entries(patch)) {
        const col = key === "pipeline_id" ? "pipeline_id"
          : key === "stage_index" ? "stage_index"
          : key === "task_id" ? "task_id"
          : key
        sets.push(`${col} = ?`)
        params.push(value ?? null)
      }
      if (sets.length === 0) return
      params.push(stageId)
      db.run(`UPDATE pipeline_stages SET ${sets.join(", ")} WHERE id = ?`, params)
      persist()
    },

    async addRecurring(r) {
      db.run(
        `INSERT INTO recurring (id, name, directory, prompt, model, cron, timezone, enabled, last_run_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.name, r.directory, r.prompt, r.model, r.cron,
         r.timezone ?? null, r.enabled ? 1 : 0, r.last_run_at ?? null],
      )
      persist()
    },

    async listRecurring() {
      const stmt = db.prepare("SELECT * FROM recurring ORDER BY name")
      const records: RecurringRecord[] = []
      while (stmt.step()) {
        records.push(rowToRecurring(stmt.getAsObject() as Record<string, unknown>))
      }
      stmt.free()
      return records
    },

    async getRecurring(id) {
      const stmt = db.prepare("SELECT * FROM recurring WHERE id = ?")
      stmt.bind([id])
      if (!stmt.step()) { stmt.free(); return null }
      const row = stmt.getAsObject() as Record<string, unknown>
      stmt.free()
      return rowToRecurring(row)
    },

    async updateRecurring(id, patch) {
      const sets: string[] = []
      const params: unknown[] = []
      for (const [key, value] of Object.entries(patch)) {
        const col = key === "last_run_at" ? "last_run_at"
          : key === "enabled" ? "enabled"
          : key
        sets.push(`${col} = ?`)
        if (key === "enabled") params.push(value ? 1 : 0)
        else params.push(value ?? null)
      }
      if (sets.length === 0) return
      params.push(id)
      db.run(`UPDATE recurring SET ${sets.join(", ")} WHERE id = ?`, params)
      persist()
    },

    async removeRecurring(id) {
      db.run("DELETE FROM recurring WHERE id = ?", [id])
      persist()
    },
  }
}
