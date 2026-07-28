import { CronJob } from "croner"
import type { Logger } from "@/shared/logger"

export interface ScheduledTask {
  id: string
  title: string
  instructions: string
  cron: string
  timezone: string
  workspace: string
  agent: string
  enabled: boolean
  next_run: number | null
  last_run: number | null
}

export interface AutomationSchedulerHandler {
  executeTask(task: ScheduledTask, trigger: "schedule" | "catchup"): Promise<void>
}

export class AutomationScheduler {
  private jobs = new Map<string, CronJob>()
  private tickTimer: ReturnType<typeof setInterval> | null = null
  private readonly tickIntervalMs: number
  private readonly logger: Logger
  private readonly handler: AutomationSchedulerHandler
  private tasks: ScheduledTask[] = []

  constructor(tickIntervalMs: number, logger: Logger, handler: AutomationSchedulerHandler) {
    this.tickIntervalMs = tickIntervalMs
    this.logger = logger.child({ component: "automation-scheduler" })
    this.handler = handler
  }

  start(): void {
    this.logger.info("Automation scheduler started", { tickIntervalMs: this.tickIntervalMs })
    this.tickTimer = setInterval(() => this.tick(), this.tickIntervalMs)
  }

  stop(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
    for (const job of this.jobs.values()) job.stop()
    this.jobs.clear()
  }

  loadTasks(tasks: ScheduledTask[]): void {
    this.tasks = tasks
    for (const task of tasks) {
      if (!task.enabled) continue
      if (this.jobs.has(task.id)) continue

      const job = new CronJob(task.cron, { timezone: task.timezone }, () => {
        this.handler.executeTask(task, "schedule").catch((err) => {
          this.logger.error("Task execution failed", { taskId: task.id, error: String(err) })
        })
      })
      this.jobs.set(task.id, job)
    }
  }

  private tick(): void {
    const now = Date.now() / 1000
    for (const task of this.tasks) {
      if (!task.enabled) continue
      if (task.next_run && task.next_run <= now && !task.last_run) {
        this.logger.info("Catch-up run", { taskId: task.id })
        this.handler.executeTask(task, "catchup").catch((err) => {
          this.logger.error("Catch-up execution failed", { taskId: task.id, error: String(err) })
        })
      }
    }
  }
}
