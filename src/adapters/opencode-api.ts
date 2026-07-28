import type { DaemonConfig } from "@/config"
import type { Logger } from "@/shared/logger"
import { OpenCodeAPIError } from "@/shared/errors"
import type {
  OpenCodeSession,
  OpenCodeMessage,
  OpenCodeAgent,
  OpenCodeConfig,
  OpenCodeSSEEvent,
} from "@/types/opencode"

export interface OpenCodeAPIClient {
  health(): Promise<{ healthy: boolean; version: string }>
  createSession(opts?: { title?: string; parentID?: string }): Promise<OpenCodeSession>
  getSession(id: string): Promise<OpenCodeSession>
  deleteSession(id: string): Promise<void>
  listSessions(): Promise<OpenCodeSession[]>
  abortSession(id: string): Promise<void>
  sendMessage(id: string, opts: { parts: Array<{ type: string; text: string }>; model?: { providerID: string; modelID: string }; agent?: string; noReply?: boolean }): Promise<OpenCodeMessage>
  sendMessageAsync(id: string, opts: { parts: Array<{ type: string; text: string }>; model?: { providerID: string; modelID: string }; agent?: string }): Promise<void>
  getMessages(id: string, opts?: { limit?: number }): Promise<OpenCodeMessage[]>
  respondPermission(sessionId: string, permissionId: string, response: string, remember?: boolean): Promise<void>
  getConfig(): Promise<OpenCodeConfig>
  updateConfig(config: Partial<OpenCodeConfig>): Promise<OpenCodeConfig>
  listAgents(): Promise<OpenCodeAgent[]>
  subscribeEvents(): AsyncIterable<OpenCodeSSEEvent>
}

export function createOpenCodeAPIClient(config: DaemonConfig, logger: Logger): OpenCodeAPIClient {
  const base = `http://${config.opencode.host}:${config.opencode.port}`
  const log = logger.child({ component: "opencode-api" })
  const timeoutMs = 30_000

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${base}${path}`
    log.debug("API request", { method, path })

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      if (!resp.ok) {
        const text = await resp.text().catch(() => "")
        throw new OpenCodeAPIError(`${method} ${path} → ${resp.status}`, resp.status, text)
      }

      if (resp.status === 204) return undefined as T
      return (await resp.json()) as T
    } finally {
      clearTimeout(timer)
    }
  }

  async function* subscribeEvents(): AsyncIterable<OpenCodeSSEEvent> {
    const url = `${base}/global/event`
    log.info("Connecting to SSE stream")

    while (true) {
      try {
        const resp = await fetch(url, {
          headers: { Accept: "text/event-stream" },
        })

        if (!resp.ok || !resp.body) {
          log.warn("SSE connection failed", { status: resp.status })
          await new Promise((r) => setTimeout(r, 2000))
          continue
        }

        const reader = resp.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event = JSON.parse(line.slice(6)) as OpenCodeSSEEvent
                yield event
              } catch {
                // skip malformed
              }
            }
          }
        }
      } catch (err) {
        log.warn("SSE stream error", { error: String(err) })
        await new Promise((r) => setTimeout(r, 2000))
      }
    }
  }

  return {
    health: () => request("GET", "/global/health"),
    createSession: (opts) => request("POST", "/session", { body: opts }),
    getSession: (id) => request("GET", `/session/${id}`),
    deleteSession: (id) => request("DELETE", `/session/${id}`),
    listSessions: () => request("GET", "/session"),
    abortSession: (id) => request("POST", `/session/${id}/abort`),
    sendMessage: (id, opts) => request("POST", `/session/${id}/message`, opts),
    sendMessageAsync: (id, opts) => request("POST", `/session/${id}/prompt_async`, opts),
    getMessages: (id, opts) => request("GET", `/session/${id}/message?limit=${opts?.limit ?? 100}`),
    respondPermission: (sid, pid, response, remember) =>
      request("POST", `/session/${sid}/permissions/${pid}`, { response, remember }),
    getConfig: () => request("GET", "/config"),
    updateConfig: (cfg) => request("PATCH", "/config", cfg),
    listAgents: () => request("GET", "/agent"),
    subscribeEvents,
  }
}
