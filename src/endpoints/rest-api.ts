import { Hono } from "hono"
import { cors } from "hono/cors"
import type { Logger } from "@/shared/logger"
import type { OpenCodeAPIClient } from "@/adapters/opencode-api"
import type { InboxStoreAdapter } from "@/adapters/inbox-store"
import type { ConversationStoreAdapter } from "@/adapters/conversation-store"
import type { GUIBroadcastAdapter } from "@/adapters/gui-broadcast"

export interface RestAPIOptions {
  api: OpenCodeAPIClient
  inbox: InboxStoreAdapter | null
  conversations: ConversationStoreAdapter | null
  broadcast: GUIBroadcastAdapter
  logger: Logger
  standalone: boolean
}

export function createRestAPI(opts: RestAPIOptions): Hono {
  const { api, inbox, conversations, broadcast, logger, standalone } = opts
  const log = logger.child({ component: "rest-api" })
  const app = new Hono()

  app.use("*", cors())

  app.get("/", async (c) => {
    return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Opensheeta</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 60px auto; padding: 0 20px; color: #333; }
    h1 { color: #1a1a1a; }
    a { color: #0066cc; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    ul { line-height: 2; }
  </style>
</head>
<body>
  <h1>Opensheeta</h1>
  <p>Status: <a href="/health">/health</a></p>
  <h2>API Endpoints</h2>
  <ul>
    <li><code>GET</code> <a href="/v1/sessions">/v1/sessions</a></li>
    <li><code>POST</code> /v1/sessions</li>
    <li><code>GET</code> /v1/sessions/:id</li>
    <li><code>DELETE</code> /v1/sessions/:id</li>
    <li><code>POST</code> /v1/sessions/:id/messages</li>
    <li><code>GET</code> /v1/sessions/:id/messages</li>
    <li><code>GET</code> <a href="/v1/inbox">/v1/inbox</a></li>
    <li><code>GET</code> <a href="/v1/agents">/v1/agents</a></li>
  </ul>
</body>
</html>`)
  })

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

  return app
}
