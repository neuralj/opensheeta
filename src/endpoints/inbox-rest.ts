import { Hono } from "hono"
import type { Logger } from "@/shared/logger"
import type { InboxStoreAdapter } from "@/adapters/inbox-store"

export interface InboxRESTHandlers {
  onResolve(itemId: string, resolution: string): void
}

export function createInboxREST(
  store: InboxStoreAdapter,
  logger: Logger,
  handlers: InboxRESTHandlers,
): Hono {
  const app = new Hono()
  const log = logger.child({ component: "inbox-rest" })

  app.get("/v1/inbox", async (c) => {
    const sessionId = c.req.query("session_id")
    const items = await store.listPending(sessionId)
    return c.json({ items })
  })

  app.get("/v1/inbox/:id", async (c) => {
    const item = await store.getItem(c.req.param("id"))
    if (!item) return c.json({ error: "Not found" }, 404)
    return c.json({ item })
  })

  app.post("/v1/inbox/:id/resolve", async (c) => {
    const body = await c.req.json() as { resolution: string }
    const id = c.req.param("id")
    const ok = await store.resolve(id, body.resolution)
    if (!ok) return c.json({ ok: false, error: "Already resolved or not found" }, 409)
    handlers.onResolve(id, body.resolution)
    log.info("Inbox item resolved via REST", { id, resolution: body.resolution })
    return c.json({ ok: true })
  })

  app.get("/v1/inbox/:id/wait", async (c) => {
    const id = c.req.param("id")
    const resolution = await store.waitForResolution(id)
    if (resolution === null) return c.json({ error: "Timeout" }, 408)
    return c.json({ id, resolution })
  })

  return app
}
