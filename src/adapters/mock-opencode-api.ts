import type { Logger } from "@/shared/logger"
import type {
  OpenCodeSession,
  OpenCodeMessage,
  OpenCodeAgent,
  OpenCodeConfig,
  OpenCodeSSEEvent,
} from "@/types/opencode"
import type { OpenCodeAPIClient } from "@/adapters/opencode-api"

export function createMockOpenCodeAPIClient(logger: Logger): OpenCodeAPIClient {
  const log = logger.child({ component: "mock-opencode-api" })
  const sessions = new Map<string, OpenCodeSession>()
  const sseListeners = new Set<(event: OpenCodeSSEEvent) => void>()

  function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  return {
    async health() {
      return { healthy: true, version: "mock-1.0.0" }
    },

    async createSession(opts) {
      const session: OpenCodeSession = {
        id: generateId(),
        title: opts?.title ?? "Untitled",
        time: { created: Date.now() },
      }
      sessions.set(session.id, session)
      log.info("Mock session created", { id: session.id, title: session.title })
      return session
    },

    async getSession(id) {
      const session = sessions.get(id)
      if (!session) throw new Error(`Session ${id} not found`)
      return session
    },

    async deleteSession(id) {
      sessions.delete(id)
      log.info("Mock session deleted", { id })
    },

    async listSessions() {
      return Array.from(sessions.values())
    },

    async abortSession(id) {
      log.info("Mock session aborted", { id })
    },

    async sendMessage(id, opts) {
      const message: OpenCodeMessage = {
        id: generateId(),
        role: "assistant",
        parts: [{ type: "text", text: `Mock response to: ${opts.parts.map(p => p.text).join(" ")}` }],
        metadata: {
          time: { created: Date.now(), completed: Date.now() },
          sessionID: id,
        },
      }

      const userMsg: OpenCodeMessage = {
        id: generateId(),
        role: "user",
        parts: opts.parts as OpenCodeMessage["parts"],
        metadata: {
          time: { created: Date.now() },
          sessionID: id,
        },
      }

      setTimeout(() => {
        for (const listener of sseListeners) {
          listener({ id: generateId(), type: "session.status", properties: { sessionID: id, status: "busy" } })
        }
      }, 100)

      setTimeout(() => {
        for (const listener of sseListeners) {
          listener({ id: generateId(), type: "message.part.updated", properties: { sessionID: id, type: "text", text: message.parts[0].type === "text" ? message.parts[0].text : "" } })
        }
      }, 300)

      setTimeout(() => {
        for (const listener of sseListeners) {
          listener({ id: generateId(), type: "session.idle", properties: { sessionID: id } })
        }
      }, 500)

      return message
    },

    async sendMessageAsync(_id, _opts) {
      // fire and forget
    },

    async getMessages(_id) {
      return []
    },

    async respondPermission(_sessionId, _permissionId, response) {
      log.info("Mock permission responded", { response })
    },

    async getConfig() {
      return {
        model: { providerID: "mock", modelID: "mock-model" },
      }
    },

    async updateConfig(config) {
      return { ...await this.getConfig(), ...config }
    },

    async listAgents() {
      return [
        { name: "build", description: "Full-access development agent", mode: "primary" as const },
        { name: "plan", description: "Read-only analysis agent", mode: "primary" as const },
      ]
    },

    async *subscribeEvents() {
      const queue: OpenCodeSSEEvent[] = []
      const listener = (event: OpenCodeSSEEvent) => queue.push(event)
      sseListeners.add(listener)

      try {
        while (true) {
          if (queue.length > 0) {
            yield queue.shift()!
          } else {
            await new Promise((r) => setTimeout(r, 100))
          }
        }
      } finally {
        sseListeners.delete(listener)
      }
    },
  }
}

export function emitMockEvent(
  api: OpenCodeAPIClient,
  event: OpenCodeSSEEvent,
): void {
  // This is a helper for tests to inject events into the mock SSE stream
  // In practice, the mock API's sendMessage already generates events
  void api
  void event
}
