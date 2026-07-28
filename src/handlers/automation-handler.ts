import type { Logger } from "@/shared/logger"
import type { OpenCodeAPIClient } from "@/adapters/opencode-api"
import type { ConversationStoreAdapter } from "@/adapters/conversation-store"
import type { ScheduledTask } from "@/scheduler/automation-scheduler"

export interface TaskRun {
  task_id: string
  run_id: string
  started_at: number
  finished_at: number | null
  status: "running" | "ok" | "error" | "skipped"
  result_text: string | null
  error: string | null
  trigger: string
  session_id: string
}

export interface AutomationHandler {
  executeTask(task: ScheduledTask, trigger: "schedule" | "catchup"): Promise<void>
  listRuns(taskId: string): TaskRun[]
}

export function createAutomationHandler(
  api: OpenCodeAPIClient,
  conversations: ConversationStoreAdapter,
  logger: Logger,
): AutomationHandler {
  const log = logger.child({ component: "automation-handler" })
  const runs = new Map<string, TaskRun[]>()
  const runningIds = new Set<string>()

  return {
    async executeTask(task, trigger) {
      if (runningIds.has(task.id)) {
        log.warn("Task already running, skipping", { taskId: task.id })
        return
      }

      runningIds.add(task.id)
      const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const sessionId = `__run__${runId}`

      const run: TaskRun = {
        task_id: task.id,
        run_id: runId,
        started_at: Date.now() / 1000,
        finished_at: null,
        status: "running",
        result_text: null,
        error: null,
        trigger,
        session_id: sessionId,
      }

      if (!runs.has(task.id)) runs.set(task.id, [])
      runs.get(task.id)!.push(run)

      try {
        log.info("Executing automation task", { taskId: task.id, trigger })

        const session = await api.createSession({ title: `${task.title} - ${trigger}` })

        await api.sendMessageAsync(session.id, {
          agent: task.agent,
          parts: [{ type: "text", text: task.instructions }],
        })

        run.status = "ok"
        run.result_text = "Task completed"
      } catch (err) {
        run.status = "error"
        run.error = String(err)
        log.error("Automation task failed", { taskId: task.id, error: String(err) })
      } finally {
        run.finished_at = Date.now() / 1000
        runningIds.delete(task.id)
      }
    },

    listRuns(taskId) {
      return runs.get(taskId) ?? []
    },
  }
}
