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

  // Initialize adapters
  const secretStore = createSecretStore(config.secrets.path, logger)
  const broadcast = createGUIBroadcast(logger)

  // Initialize stores (optional in standalone mode)
  let inbox: InboxStoreAdapter | null = null
  let conversations: ConversationStoreAdapter | null = null

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

  // Initialize OpenCode API client
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

  // Start health probe (only if not standalone)
  let healthProbe: HealthProbeScheduler | null = null
  if (!standalone && opencodeProcess) {
    healthProbe = new HealthProbeScheduler(api, config.opencode.healthIntervalMs, logger, {
      onHealthy: () => {},
      onUnhealthy: (err) => log.warn("OpenCode unhealthy", { error: err }),
    })
    healthProbe.start()
  }

  // Start REST API server
  const restAPI = createRestAPI({
    api,
    inbox,
    conversations,
    broadcast,
    logger,
    standalone,
  })

  const server = serve({
    fetch: restAPI.fetch,
    port: config.port,
    hostname: config.host,
  })

  log.info("REST API server started", { port: config.port, host: config.host })

  // Start WebSocket server on a different port
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
        // TODO: Route messages to session handler
      },
      onDisconnect: (sessionId) => {
        broadcast.unregister(sessionId)
        log.info("GUI disconnected", { sessionId })
      },
    },
  })
  guiWs.start()

  log.info("WebSocket server started", { port: wsPort })

  const shutdown = async (signal: string) => {
    log.info("Shutting down", { signal })
    healthProbe?.stop()
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
  })
}

main().catch((err) => {
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", msg: "Fatal error", error: err.message, stack: err.stack }))
  process.exit(1)
})
