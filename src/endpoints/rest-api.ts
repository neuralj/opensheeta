import { Hono } from "hono"
import { cors } from "hono/cors"
import { serveStatic } from "@hono/node-server/serve-static"
import { existsSync } from "fs"
import type { Logger } from "@/shared/logger"
import type { OpenCodeAPIClient } from "@/adapters/opencode-api"
import type { InboxStoreAdapter } from "@/adapters/inbox-store"
import type { ConversationStoreAdapter } from "@/adapters/conversation-store"
import type { TaskStoreAdapter } from "@/adapters/task-store"
import type { GUIBroadcastAdapter } from "@/adapters/gui-broadcast"
import type { QueueProcessor } from "@/scheduler/queue-processor"
import type { CooldownManager } from "@/scheduler/cooldown-manager"
import type { PipelineRunner } from "@/scheduler/pipeline-runner"
import type { RecurringScheduler } from "@/scheduler/recurring-scheduler"
import type { EventBus } from "@/scheduler/event-bus"

export interface RestAPIOptions {
  api: OpenCodeAPIClient
  inbox: InboxStoreAdapter | null
  conversations: ConversationStoreAdapter | null
  taskStore: TaskStoreAdapter | null
  queue: QueueProcessor | null
  cooldown: CooldownManager | null
  pipeline: PipelineRunner | null
  recurring: RecurringScheduler | null
  events: EventBus | null
  broadcast: GUIBroadcastAdapter
  logger: Logger
  standalone: boolean
}

export function createRestAPI(opts: RestAPIOptions): Hono {
  const { api, inbox, conversations, taskStore, queue, cooldown, pipeline, recurring, events, broadcast, logger, standalone } = opts
  const log = logger.child({ component: "rest-api" })
  const app = new Hono()

  app.use("*", cors())

  // Health check
  app.get("/health", async (c) => {
    try {
      const health = await api.health()
      return c.json({
        status: "ok",
        mode: standalone ? "standalone" : "full",
        opencode: health.healthy ? "connected" : "disconnected",
        version: health.version,
      })
    } catch {
      return c.json({
        status: "ok",
        mode: standalone ? "standalone" : "full",
        opencode: "disconnected",
      })
    }
  })

  // Sessions
  app.get("/v1/sessions", async (c) => {
    try {
      const sessions = await api.listSessions()
      return c.json({ sessions })
    } catch (err) {
      log.error("Failed to list sessions", { error: String(err) })
      return c.json({ sessions: [] })
    }
  })

  app.post("/v1/sessions", async (c) => {
    try {
      const body = await c.req.json() as { title?: string }
      const session = await api.createSession({ title: body.title })

      if (conversations) {
        await conversations.save({
          session_id: session.id,
          workspace: "",
          model: "",
          mode: "interactive",
          agent: "cowork",
          title: session.title,
          message_count: 0,
          updated_at: new Date().toISOString(),
          pinned: false,
          archived: false,
        })
      }

      return c.json(session, 201)
    } catch (err) {
      log.error("Failed to create session", { error: String(err) })
      return c.json({ error: String(err) }, 500)
    }
  })

  app.get("/v1/sessions/:id", async (c) => {
    try {
      const session = await api.getSession(c.req.param("id"))
      return c.json(session)
    } catch (err) {
      return c.json({ error: "Not found" }, 404)
    }
  })

  app.delete("/v1/sessions/:id", async (c) => {
    try {
      await api.deleteSession(c.req.param("id"))
      return c.json({ ok: true })
    } catch (err) {
      return c.json({ error: String(err) }, 500)
    }
  })

  // Messages
  app.post("/v1/sessions/:id/messages", async (c) => {
    try {
      const body = await c.req.json() as { text: string }
      const message = await api.sendMessage(c.req.param("id"), {
        parts: [{ type: "text", text: body.text }],
      })
      return c.json(message, 201)
    } catch (err) {
      log.error("Failed to send message", { error: String(err) })
      return c.json({ error: String(err) }, 500)
    }
  })

  app.get("/v1/sessions/:id/messages", async (c) => {
    try {
      const messages = await api.getMessages(c.req.param("id"))
      return c.json({ messages })
    } catch (err) {
      return c.json({ messages: [] })
    }
  })

  // Inbox
  app.get("/v1/inbox", async (c) => {
    if (!inbox) {
      return c.json({ items: [] })
    }
    const sessionId = c.req.query("session_id")
    const items = await inbox.listPending(sessionId)
    return c.json({ items })
  })

  app.get("/v1/inbox/:id", async (c) => {
    if (!inbox) {
      return c.json({ error: "Inbox not available" }, 503)
    }
    const item = await inbox.getItem(c.req.param("id"))
    if (!item) {
      return c.json({ error: "Not found" }, 404)
    }
    return c.json({ item })
  })

  app.post("/v1/inbox/:id/resolve", async (c) => {
    if (!inbox) {
      return c.json({ error: "Inbox not available" }, 503)
    }
    const body = await c.req.json() as { resolution: string }
    const ok = await inbox.resolve(c.req.param("id"), body.resolution)
    if (!ok) {
      return c.json({ ok: false, error: "Already resolved or not found" }, 409)
    }
    log.info("Inbox item resolved via REST", { id: c.req.param("id"), resolution: body.resolution })
    return c.json({ ok: true })
  })

  // Test endpoints (standalone mode only)
  if (standalone) {
    app.post("/v1/test/events", async (c) => {
      const body = await c.req.json() as { sessionId: string; event: unknown }
      broadcast.broadcast(body.sessionId, body.event as any)
      return c.json({ ok: true })
    })

    app.post("/v1/test/mock-session", async (c) => {
      const body = await c.req.json() as { title?: string }
      const session = await api.createSession({ title: body.title })
      return c.json(session, 201)
    })
  }

  // Agents
  app.get("/v1/agents", async (c) => {
    try {
      const agents = await api.listAgents()
      return c.json({ agents })
    } catch (err) {
      return c.json({ agents: [] })
    }
  })

  // Tasks
  app.post("/v1/tasks", async (c) => {
    if (!taskStore || !queue) return c.json({ error: "Task queue not available" }, 503)
    const body = await c.req.json() as {
      prompt: string
      directory?: string
      model?: string
      on_success?: string
      on_failure?: string
      max_chain_depth?: number
    }
    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      directory: body.directory ?? "",
      prompt: body.prompt,
      model: body.model ?? "",
      status: "pending" as const,
      attempts: 0,
      max_attempts: 5,
      created_at: Date.now(),
      updated_at: Date.now(),
      on_success: body.on_success,
      on_failure: body.on_failure,
      chain_depth: 0,
      max_chain_depth: body.max_chain_depth ?? 10,
    }
    await taskStore.enqueue(task)
    events?.emitTask({ id: task.id, status: "pending" })
    return c.json(task, 201)
  })

  app.get("/v1/tasks", async (c) => {
    if (!taskStore) return c.json({ tasks: [] })
    const status = c.req.query("status")
    const tasks = await taskStore.listTasks(status ? { status } : undefined)
    return c.json({ tasks })
  })

  app.get("/v1/tasks/:id", async (c) => {
    if (!taskStore) return c.json({ error: "Task store not available" }, 503)
    const task = await taskStore.getTask(c.req.param("id"))
    if (!task) return c.json({ error: "Not found" }, 404)
    return c.json(task)
  })

  app.post("/v1/tasks/:id/abort", async (c) => {
    if (!taskStore) return c.json({ error: "Task store not available" }, 503)
    const task = await taskStore.getTask(c.req.param("id"))
    if (!task) return c.json({ error: "Not found" }, 404)
    if (task.agent_id) {
      try { await api.abortSession(task.agent_id) } catch { /* best effort */ }
    }
    await taskStore.updateTask(task.id, { status: "failed", error: "aborted" })
    events?.emitTask({ id: task.id, status: "failed", error: "aborted" })
    return c.json({ ok: true })
  })

  app.post("/v1/tasks/:id/retry", async (c) => {
    if (!taskStore) return c.json({ error: "Task store not available" }, 503)
    await taskStore.markRetry(c.req.param("id"))
    return c.json({ ok: true })
  })

  app.get("/v1/tasks/:id/chain", async (c) => {
    if (!taskStore) return c.json({ error: "Task store not available" }, 503)
    const taskId = c.req.param("id")
    const task = await taskStore.getTask(taskId)
    if (!task) return c.json({ error: "Not found" }, 404)

    let parent = null
    if (task.parent_task_id) {
      parent = await taskStore.getTask(task.parent_task_id)
    }

    const allTasks = await taskStore.listTasks()
    const children = allTasks.filter((t) => t.parent_task_id === taskId)

    return c.json({ task, parent, children })
  })

  // Queue control
  app.post("/v1/queue", async (c) => {
    if (!queue) return c.json({ error: "Queue not available" }, 503)
    const body = await c.req.json() as { action: "pause" | "resume" }
    if (body.action === "pause") queue.pause()
    else if (body.action === "resume") queue.resume()
    return c.json({ paused: queue.isPaused() })
  })

  // Pipelines
  app.post("/v1/pipelines", async (c) => {
    if (!taskStore || !pipeline) return c.json({ error: "Pipeline not available" }, 503)
    const body = await c.req.json() as {
      name?: string
      directory?: string
      stages: Array<{ prompt: string; model?: string; label?: string }>
    }
    const plId = `pl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const now = Date.now()
    await taskStore.addPipeline({
      id: plId,
      name: body.name ?? "Pipeline",
      directory: body.directory ?? "",
      status: "pending",
      current_stage: 0,
      created_at: now,
      updated_at: now,
    })
    for (let i = 0; i < body.stages.length; i++) {
      const s = body.stages[i]
      await taskStore.addStage({
        id: `stg_${plId}_${i}`,
        pipeline_id: plId,
        stage_index: i,
        label: s.label ?? `Stage ${i + 1}`,
        prompt: s.prompt,
        model: s.model,
        status: "pending",
      })
    }
    const result = await pipeline.start(plId)
    return c.json(result, 201)
  })

  app.get("/v1/pipelines", async (c) => {
    if (!taskStore) return c.json({ pipelines: [] })
    const pipelines = await taskStore.listPipelines()
    const result = []
    for (const pl of pipelines) {
      const stages = await taskStore.getStages(pl.id)
      result.push({ ...pl, stages })
    }
    return c.json({ pipelines: result })
  })

  app.get("/v1/pipelines/:id", async (c) => {
    if (!taskStore) return c.json({ error: "Task store not available" }, 503)
    const pl = await taskStore.getPipeline(c.req.param("id"))
    if (!pl) return c.json({ error: "Not found" }, 404)
    const stages = await taskStore.getStages(pl.id)
    return c.json({ ...pl, stages })
  })

  app.delete("/v1/pipelines/:id", async (c) => {
    if (!taskStore) return c.json({ error: "Task store not available" }, 503)
    await taskStore.removePipeline(c.req.param("id"))
    return c.json({ ok: true })
  })

  app.post("/v1/pipelines/:id/abort", async (c) => {
    if (!pipeline) return c.json({ error: "Pipeline not available" }, 503)
    try {
      await pipeline.abort(c.req.param("id"))
      return c.json({ ok: true })
    } catch (err) {
      return c.json({ error: String(err) }, 500)
    }
  })

  // Recurring tasks
  app.get("/v1/recurring", async (c) => {
    if (!recurring) return c.json({ recurring: [] })
    const items = await recurring.list()
    return c.json({ recurring: items })
  })

  app.post("/v1/recurring", async (c) => {
    if (!recurring) return c.json({ error: "Recurring scheduler not available" }, 503)
    const body = await c.req.json() as {
      name: string
      directory?: string
      prompt: string
      cron: string
      model?: string
      timezone?: string
      enabled?: boolean
    }
    const item = await recurring.add({
      name: body.name,
      directory: body.directory ?? "",
      prompt: body.prompt,
      model: body.model ?? "",
      cron: body.cron,
      timezone: body.timezone,
      enabled: body.enabled ?? true,
    })
    return c.json(item, 201)
  })

  app.put("/v1/recurring/:id", async (c) => {
    if (!taskStore) return c.json({ error: "Task store not available" }, 503)
    const id = c.req.param("id")
    const body = await c.req.json() as {
      name?: string
      prompt?: string
      cron?: string
      enabled?: boolean
    }
    const existing = await taskStore.getRecurring(id)
    if (!existing) return c.json({ error: "Not found" }, 404)

    await taskStore.updateRecurring(id, {
      name: body.name ?? existing.name,
      prompt: body.prompt ?? existing.prompt,
      cron: body.cron ?? existing.cron,
      enabled: body.enabled ?? existing.enabled,
    })
    const updated = await taskStore.getRecurring(id)
    return c.json(updated)
  })

  app.delete("/v1/recurring/:id", async (c) => {
    if (!recurring) return c.json({ error: "Recurring scheduler not available" }, 503)
    await recurring.remove(c.req.param("id"))
    return c.json({ ok: true })
  })

  const publicDir = existsSync("./public") ? "./public" : "./frontend/dist"
  
  if (existsSync(publicDir)) {
    app.use("/assets/*", serveStatic({ root: publicDir }))
    app.get("*", serveStatic({ path: `${publicDir}/index.html` }))
  }

  return app
}
