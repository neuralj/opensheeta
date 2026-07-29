import type { OpenCodeAPIClient } from "@/adapters/opencode-api"
import type { TaskStoreAdapter } from "@/adapters/task-store"
import type { CooldownManager } from "@/scheduler/cooldown-manager"
import type { EventBus } from "@/scheduler/event-bus"
import type { Logger } from "@/shared/logger"
import type { TaskRecord } from "@/types/task"

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export interface QueueProcessor {
  pause(): void
  resume(): void
  isPaused(): boolean
  setCooldown(cooldown: CooldownManager): void
  processOne(): Promise<boolean>
  recoverStaleRunning(): Promise<void>
  run(): Promise<void>
  stop(): void
}

export function createQueueProcessor(
  api: OpenCodeAPIClient,
  store: TaskStoreAdapter,
  events: EventBus,
  logger: Logger,
  defaultModel = "",
): QueueProcessor {
  const log = logger.child({ component: "queue-processor" })
  let paused = false
  let running = true
  let cooldown: CooldownManager | null = null

  function pause(): void { paused = true }
  function resume(): void { paused = false }
  function isPaused(): boolean { return paused }
  function setCooldown(cd: CooldownManager): void { cooldown = cd }

  async function triggerChain(task: TaskRecord, outcome: "success" | "failure"): Promise<void> {
    const chainPrompt = outcome === "success" ? task.on_success : task.on_failure
    if (!chainPrompt) return

    const depth = task.chain_depth ?? 0
    const maxDepth = task.max_chain_depth ?? 10
    if (depth >= maxDepth) {
      log.warn("Chain depth exceeded, skipping", { taskId: task.id, depth, maxDepth })
      return
    }

    const newTask: TaskRecord = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      directory: task.directory,
      prompt: chainPrompt,
      model: task.model,
      status: "pending",
      attempts: 0,
      max_attempts: task.max_attempts,
      created_at: Date.now(),
      updated_at: Date.now(),
      chain_depth: depth + 1,
      max_chain_depth: maxDepth,
      parent_task_id: task.id,
      on_success: task.on_success,
      on_failure: task.on_failure,
    }

    await store.enqueue(newTask)
    events.emitTask({ id: newTask.id, status: "pending" })
    log.info("Chain task enqueued", { parentId: task.id, taskId: newTask.id, outcome, depth: depth + 1 })
  }

  async function processOne(): Promise<boolean> {
    if (paused) return false
    const task = await store.peekPending()
    if (!task) return false
    if (task.agent_id && cooldown?.has(task.agent_id)) return false

    await store.markRunning(task.id)
    events.emitTask({ id: task.id, status: "running" })

    try {
      let agentId = task.agent_id
      if (!agentId) {
        try {
          const session = await api.createSession({ title: task.prompt.slice(0, 80) })
          agentId = session.id
          await store.updateTask(task.id, { agent_id: agentId })
        } catch {
          events.emitStatus({ offline: true, task_id: task.id })
          return true
        }
      }

      const model = task.model || defaultModel
      const sendOpts: Record<string, unknown> = {
        parts: [{ type: "text", text: task.prompt }],
      }
      if (model) {
        const parts = model.split("/")
        sendOpts.model = parts.length === 2
          ? { providerID: parts[0], modelID: parts[1] }
          : { providerID: "", modelID: model }
      }

      const response = await api.sendMessage(agentId, sendOpts as Parameters<typeof api.sendMessage>[1])
      const aborted = response.metadata?.error?.name === "MessageAbortedError"

      if (aborted) {
        await store.markFailed(task.id, "rate limited")
        cooldown?.add(agentId)
        events.emitStatus({ cooldowns: cooldown?.getCooldowns() ?? [] })
        await triggerChain(task, "failure")
      } else {
        await store.markCompleted(task.id)
        events.emitTask({ id: task.id, status: "completed" })
        await triggerChain(task, "success")
      }
    } catch (e) {
      const msg = String(e)
      await store.markFailed(task.id, msg)
      events.emitTask({ id: task.id, status: "failed", error: msg })
      await triggerChain(task, "failure")
    }
    return true
  }

  async function recoverStaleRunning(): Promise<void> {
    const all = await store.listTasks()
    const staleCutoff = Date.now() - 30 * 60 * 1000
    for (const t of all) {
      if (t.status !== "running") continue
      if (!t.agent_id) {
        await store.updateTask(t.id, { status: "pending", agent_id: undefined })
        continue
      }
      try {
        const msgs = await api.getMessages(t.agent_id)
        const lastMsg = msgs[msgs.length - 1]
        if (lastMsg?.metadata?.time?.completed) {
          await store.markCompleted(t.id)
          events.emitTask({ id: t.id, status: "completed" })
        } else if (t.updated_at < staleCutoff) {
          await store.markFailed(t.id, "timeout (stale running)")
        }
      } catch {
        await store.updateTask(t.id, { status: "pending" })
      }
    }
  }

  async function run(): Promise<void> {
    await recoverStaleRunning()
    while (running) {
      if (!paused) await processOne()
      await sleep(1000)
    }
  }

  function stop(): void { running = false }

  return { pause, resume, isPaused, setCooldown, processOne, recoverStaleRunning, run, stop }
}
