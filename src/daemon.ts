import { serve } from "@hono/node-server"
import { createLogger } from "@/shared/logger"
import { loadConfig } from "@/config"
import { OpenCodeProcess } from "@/adapters/opencode-process"
import { createOpenCodeAPIClient, type OpenCodeAPIClient } from "@/adapters/opencode-api"
import { createMockOpenCodeAPIClient } from "@/adapters/mock-opencode-api"
import { createSecretStore } from "@/adapters/secret-store"
import { createSessionHandler } from "@/handlers/session-handler"
import { GUIWebSocketEndpoint } from "@/endpoints/gui-websocket"
import { HealthProbeScheduler } from "@/scheduler/health-probe"
import { createRestAPI } from "@/endpoints/rest-api"
import { createGUIBroadcast } from "@/adapters/gui-broadcast"
import { createInboxStore, type InboxStoreAdapter } from "@/adapters/inbox-store"
import { createConversationStore, type ConversationStoreAdapter } from "@/adapters/conversation-store"
import { createTaskStore, type TaskStoreAdapter } from "@/adapters/task-store"
import { EventBus } from "@/scheduler/event-bus"
import { createCooldownManager } from "@/scheduler/cooldown-manager"
import { createQueueProcessor } from "@/scheduler/queue-processor"
import { createPipelineRunner } from "@/scheduler/pipeline-runner"
import { createRecurringScheduler } from "@/scheduler/recurring-scheduler"
import { OpenCodeSSEEndpoint } from "@/endpoints/opencode-sse"
import { createEventBridgeHandler } from "@/handlers/event-bridge-handler"
import { createApprovalHandler } from "@/handlers/approval-handler"
import { createUnattendedHandler } from "@/handlers/unattended-handler"
import { createAutomationHandler } from "@/handlers/automation-handler"
import { AutomationScheduler } from "@/scheduler/automation-scheduler"
import { createPersonaHandler } from "@/handlers/persona-handler"
import type { OpenCodeSSEEvent } from "@/types/opencode"

process.on("uncaughtException", (err) => {
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", msg: "uncaughtException", error: err.message, stack: err.stack }))
  process.exit(1)
})

process.on("unhandledRejection", (reason) => {
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", msg: "unhandledRejection", reason: String(reason) }))
})

async function main(): Promise<void> {
  const config = loadConfig()
  const logger = createLogger(config.logLevel)
  const log = logger.child({ component: "daemon" })
  const standalone = process.env.OS_STANDALONE === "true"

  log.info("Starting opensheeta daemon", {
    port: config.port,
    workspace: config.workspace,
    standalone,
  })

  const secretStore = createSecretStore(config.secrets.path, logger)
  const broadcast = createGUIBroadcast(logger)

  let inbox: InboxStoreAdapter | null = null
  let conversations: ConversationStoreAdapter | null = null
  let taskStore: TaskStoreAdapter | null = null

  try {
    inbox = await createInboxStore(config.inbox.dbPath, logger)
    log.info("Inbox store initialized", { path: config.inbox.dbPath })
  } catch (err) {
    log.warn("Failed to initialize inbox store", { error: String(err) })
  }

  try {
    conversations = await createConversationStore(config.conversations.dbPath, logger)
    log.info("Conversation store initialized", { path: config.conversations.dbPath })
  } catch (err) {
    log.warn("Failed to initialize conversation store", { error: String(err) })
  }

  try {
    taskStore = await createTaskStore(config.tasks.dbPath, logger)
    log.info("Task store initialized", { path: config.tasks.dbPath })
  } catch (err) {
    log.warn("Failed to initialize task store", { error: String(err) })
  }

  let api: OpenCodeAPIClient
  let opencodeProcess: OpenCodeProcess | null = null

  if (standalone) {
    log.info("Running in standalone mode (using mock API)")
    api = createMockOpenCodeAPIClient(logger)
  } else {
    opencodeProcess = new OpenCodeProcess({ config, logger })
    api = createOpenCodeAPIClient(config, logger)

    try {
      await opencodeProcess.start()
      log.info("OpenCode process started successfully")
    } catch (err) {
      log.error("Failed to start OpenCode process", { error: String(err) })
      log.info("Falling back to standalone mode")
      api = createMockOpenCodeAPIClient(logger)
      opencodeProcess = null
    }
  }

  const sessionHandler = createSessionHandler(api, logger)

  const eventBus = new EventBus()

  const queue = createQueueProcessor(api, taskStore!, eventBus, logger)
  const cooldown = createCooldownManager(api, queue, config.cooldown.pingIntervalMs, logger)
  queue.setCooldown(cooldown)

  const pipeline = taskStore ? createPipelineRunner(taskStore, queue, eventBus, api, logger) : null
  const recurring = taskStore ? createRecurringScheduler(taskStore, queue, eventBus, logger) : null

  const eventBridge = createEventBridgeHandler(broadcast, logger)

  let approvalHandler = null
  let unattendedHandler = null
  if (inbox) {
    approvalHandler = createApprovalHandler(api, inbox, broadcast, logger)
    unattendedHandler = createUnattendedHandler(inbox, broadcast, logger)
  }

  const automationHandler = conversations
    ? createAutomationHandler(api, conversations, logger)
    : null
  const automationScheduler = new AutomationScheduler(
    config.automation.tickIntervalMs,
    logger,
    automationHandler ?? { executeTask: async () => {} },
  )

  const personaHandler = createPersonaHandler(logger)
  const personas = personaHandler.loadPersonas("./personas")

  let healthProbe: HealthProbeScheduler | null = null
  if (!standalone && opencodeProcess) {
    healthProbe = new HealthProbeScheduler(api, config.opencode.healthIntervalMs, logger, {
      onHealthy: () => {},
      onUnhealthy: (err) => log.warn("OpenCode unhealthy", { error: err }),
    })
    healthProbe.start()
  }

  eventBus.on("task", (payload: unknown) => {
    const p = payload as { id: string; status: string; error?: string; pipeline_id?: string; stage?: number }
    broadcast.broadcastAll({ type: "task_update", data: p })
    const pending = taskStore ? taskStore.listTasks({ status: "pending" }).then(t => t.length) : Promise.resolve(0)
    pending.then(count => {
      broadcast.broadcastAll({
        type: "queue_status",
        data: { pending: count, paused: queue.isPaused(), cooldowns: cooldown.getCooldowns() },
      })
    }).catch(() => {})
  })

  eventBus.on("status", (payload: unknown) => {
    const p = payload as { pipeline?: { id: string; status: string; stage?: number; total?: number } }
    if (p.pipeline) {
      broadcast.broadcastAll({ type: "pipeline_update", data: p.pipeline })
    }
  })

  const sseEndpoint = new OpenCodeSSEEndpoint(api, logger, {
    onEvent(event: OpenCodeSSEEvent) {
      const sessionId = (event.properties?.sessionID as string) ?? "broadcast"
      eventBridge.handleEvent(sessionId, event)

      if (event.type === "permission.asked" && approvalHandler && inbox) {
        const perm = event.properties as Record<string, unknown>
        const sid = (perm.sessionID as string) ?? sessionId
        const permissionId = (perm.id as string) ?? ""
        const tool = (perm.tool as string) ?? "unknown"
        const args = (perm.args as Record<string, unknown>) ?? {}
        approvalHandler.handlePermissionRequest(sid, tool, args, permissionId).catch((err) => {
          log.error("Approval handling failed", { error: String(err) })
        })
      }
    },
  })

  if (!standalone) {
    sseEndpoint.start().catch((err) => {
      log.error("SSE endpoint failed to start", { error: String(err) })
    })
  }

  const restAPI = createRestAPI({
    api,
    inbox,
    conversations,
    taskStore,
    queue,
    cooldown,
    pipeline,
    recurring,
    events: eventBus,
    broadcast,
    logger,
    standalone,
    automationScheduler,
    automationHandler,
    personas,
    unattended: unattendedHandler,
  })

  const server = serve({
    fetch: restAPI.fetch,
    port: config.port,
    hostname: config.host,
  })

  log.info("REST API server started", { port: config.port, host: config.host })

  const wsPort = config.port + 1
  const guiWs = new GUIWebSocketEndpoint({
    port: wsPort,
    host: config.host,
    token: "",
    logger,
    handlers: {
      onConnect: (ws, sessionId) => {
        broadcast.register(sessionId, ws)
        ws.send(JSON.stringify({
          type: "ready",
          data: {
            session_id: sessionId,
            agent: "cowork",
            model: standalone ? "mock" : "",
            mode: "interactive",
            workspace: config.workspace,
          },
        }))
      },
      onMessage: (_ws, sessionId, msg) => {
        log.info("GUI message received", { sessionId, type: msg.type })
        switch (msg.type) {
          case "approval":
            if (approvalHandler) {
              approvalHandler.handleGUIApproval(sessionId, msg.decision).catch((err) => {
                log.error("GUI approval failed", { error: String(err) })
              })
            }
            break
          case "user_message": {
            const sendOpts: Record<string, unknown> = {
              parts: [{ type: "text", text: msg.text }],
            }
            if (msg.model) {
              const parts = msg.model.split("/")
              sendOpts.model = parts.length === 2
                ? { providerID: parts[0], modelID: parts[1] }
                : { providerID: "", modelID: msg.model }
            }
            api.sendMessage(sessionId, sendOpts as Parameters<typeof api.sendMessage>[1]).catch((err) => {
              log.error("Failed to send message", { error: String(err) })
            })
            break
          }
          case "interrupt":
            api.abortSession(sessionId).catch((err) => {
              log.error("Failed to interrupt", { error: String(err) })
            })
            break
          case "retry":
            api.getMessages(sessionId).then((msgs) => {
              const lastUser = [...msgs].reverse().find((m) => m.role === "user")
              if (lastUser) {
                api.sendMessage(sessionId, { parts: lastUser.parts as Array<{ type: string; text: string }> }).catch((err) => {
                  log.error("Retry failed", { error: String(err) })
                })
              }
            }).catch((err) => {
              log.error("Failed to get messages for retry", { error: String(err) })
            })
            break
          case "set_model":
            api.updateConfig({ model: { providerID: "", modelID: msg.model } }).then(() => {
              broadcast.broadcast(sessionId, { type: "model_changed", data: { model: msg.model, text: `Model set to ${msg.model}` } })
            }).catch((err) => {
              log.error("Failed to set model", { error: String(err) })
            })
            break
          case "set_mode":
            log.info("Mode change requested", { sessionId, mode: msg.mode })
            break
          case "directory_response":
          case "plan_response":
          case "question_response": {
            if (inbox) {
              inbox.listPending(sessionId).then((items) => {
                const kind = msg.type === "directory_response" ? "directory"
                  : msg.type === "plan_response" ? "plan"
                  : "question"
                const item = items.find((i) => i.kind === kind)
                if (item) {
                  const resolution = msg.type === "directory_response"
                    ? JSON.stringify({ granted: msg.granted, path: msg.path, writable: msg.writable })
                    : msg.type === "plan_response"
                    ? JSON.stringify({ approved: msg.approved, mode: msg.mode, feedback: msg.feedback })
                    : msg.answer
                  inbox.resolve(item.id, resolution)
                }
              }).catch((err) => {
                log.error("Failed to resolve inbox item", { error: String(err) })
              })
            }
            break
          }
        }
      },
      onDisconnect: (sessionId) => {
        broadcast.unregister(sessionId)
        log.info("GUI disconnected", { sessionId })
      },
    },
  })
  guiWs.start()

  log.info("WebSocket server started", { port: wsPort })

  if (taskStore) {
    queue.recoverStaleRunning().catch((err) => {
      log.error("Queue recovery failed", { error: String(err) })
    })
    pipeline?.init()
    recurring?.start()
    automationScheduler.start()
    queue.run().catch((err) => {
      log.error("Queue processor stopped", { error: String(err) })
    })
    log.info("Task queue, pipeline runner, recurring scheduler, and automation scheduler started")
  }

  const shutdown = async (signal: string) => {
    log.info("Shutting down", { signal })
    healthProbe?.stop()
    sseEndpoint.stop()
    cooldown.stop()
    queue.stop()
    recurring?.stop()
    automationScheduler.stop()
    guiWs.stop()
    server.close()
    if (opencodeProcess) {
      await opencodeProcess.stop()
    }
    process.exit(0)
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"))
  process.on("SIGINT", () => shutdown("SIGINT"))

  log.info("Daemon is ready", {
    restPort: config.port,
    wsPort,
    opencodePort: config.opencode.port,
    standalone,
    taskQueue: !!taskStore,
  })
}

main().catch((err) => {
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", msg: "Fatal error", error: err.message, stack: err.stack }))
  process.exit(1)
})
