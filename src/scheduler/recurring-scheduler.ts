import type { TaskStoreAdapter } from "@/adapters/task-store"
import type { EventBus } from "@/scheduler/event-bus"
import type { QueueProcessor } from "@/scheduler/queue-processor"
import type { Logger } from "@/shared/logger"
import type { RecurringRecord } from "@/types/task"

interface ParsedField {
  set: Set<number> | null
}

const ALIASES: Record<string, string> = {
  "@hourly": "0 * * * *",
  "@daily": "0 0 * * *",
  "@weekly": "0 0 * * 0",
  "@monthly": "0 0 1 * *",
  "@yearly": "0 0 1 1 *",
}

function parseField(field: string, min: number, max: number): ParsedField {
  if (field === "*") return { set: null }
  const set = new Set<number>()
  for (const part of field.split(",")) {
    if (part.includes("/")) {
      const [range, stepStr] = part.split("/")
      const step = Number(stepStr)
      let lo = min
      let hi = max
      if (range !== "*") {
        if (range.includes("-")) {
          [lo, hi] = range.split("-").map(Number)
        } else {
          lo = hi = Number(range)
        }
      }
      for (let v = lo; v <= hi; v += step) set.add(v)
    } else if (part.includes("-")) {
      const [lo, hi] = part.split("-").map(Number)
      for (let v = lo; v <= hi; v++) set.add(v)
    } else {
      set.add(Number(part))
    }
  }
  return { set }
}

export function parseCron(expr: string): ParsedField[] | null {
  const raw = ALIASES[expr] ?? expr
  const parts = raw.trim().split(/\s+/)
  if (parts.length !== 5) return null
  return [
    parseField(parts[0], 0, 59),
    parseField(parts[1], 0, 23),
    parseField(parts[2], 1, 31),
    parseField(parts[3], 1, 12),
    parseField(parts[4], 0, 6),
  ]
}

function matches(f: ParsedField, v: number): boolean {
  return f.set === null || f.set.has(v)
}

export function nextRun(parsed: ParsedField[], from: Date): Date {
  const d = new Date(from.getTime() + 60_000)
  const limit = from.getTime() + 4 * 366 * 24 * 3600 * 1000
  while (d.getTime() < limit) {
    if (
      matches(parsed[0], d.getMinutes()) &&
      matches(parsed[1], d.getHours()) &&
      matches(parsed[2], d.getDate()) &&
      matches(parsed[3], d.getMonth() + 1) &&
      matches(parsed[4], d.getDay())
    ) {
      return d
    }
    d.setTime(d.getTime() + 60_000)
  }
  return new Date(limit)
}

export interface RecurringScheduler {
  start(): void
  stop(): void
  list(): Promise<RecurringRecord[]>
  add(r: Omit<RecurringRecord, "id" | "last_run_at">): Promise<RecurringRecord>
  remove(id: string): Promise<void>
}

export function createRecurringScheduler(
  store: TaskStoreAdapter,
  queue: QueueProcessor,
  events: EventBus,
  logger: Logger,
): RecurringScheduler {
  const log = logger.child({ component: "recurring-scheduler" })
  let tickTimer: ReturnType<typeof setInterval> | null = null

  async function tick(): Promise<void> {
    const all = await store.listRecurring()
    const now = Date.now()
    for (const r of all) {
      if (!r.enabled) continue
      const parsed = parseCron(r.cron)
      if (!parsed) continue
      const base = r.last_run_at ? new Date(r.last_run_at) : new Date(now - 60_000)
      const next = nextRun(parsed, base).getTime()
      if (next <= now) {
        await spawn(r)
        await store.updateRecurring(r.id, { last_run_at: now })
      }
    }
  }

  async function spawn(r: RecurringRecord): Promise<void> {
    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      directory: r.directory,
      prompt: r.prompt,
      model: r.model,
      status: "pending" as const,
      attempts: 0,
      max_attempts: 5,
      created_at: Date.now(),
      updated_at: Date.now(),
    }
    await store.enqueue(task)
    events.emitTask({ id: task.id, status: "pending", recurring: r.name })
    log.info("Recurring task spawned", { recurringId: r.id, name: r.name, taskId: task.id })
  }

  return {
    start() {
      tickTimer = setInterval(() => void tick(), 60_000)
      void tick()
      log.info("Recurring scheduler started")
    },

    stop() {
      if (tickTimer) {
        clearInterval(tickTimer)
        tickTimer = null
      }
    },

    async list() {
      return store.listRecurring()
    },

    async add(r) {
      const rec: RecurringRecord = {
        ...r,
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      }
      await store.addRecurring(rec)
      log.info("Recurring task added", { id: rec.id, name: rec.name, cron: rec.cron })
      return rec
    },

    async remove(id) {
      await store.removeRecurring(id)
    },
  }
}
