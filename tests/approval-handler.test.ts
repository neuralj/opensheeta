import { describe, it, expect, vi } from "vitest"
import { createApprovalHandler } from "../src/handlers/approval-handler"
import { createLogger } from "../src/shared/logger"
import type { OpenCodeAPIClient } from "../src/adapters/opencode-api"
import type { InboxStoreAdapter } from "../src/adapters/inbox-store"
import type { GUIBroadcastAdapter } from "../src/adapters/gui-broadcast"

function makeDeps() {
  const api = {
    respondPermission: vi.fn().mockResolvedValue(undefined),
  } as unknown as OpenCodeAPIClient

  const items: Array<{ id: string; session_id: string; kind: string; state: string; resolution: string | null }> = []

  const inbox = {
    addItem: vi.fn().mockImplementation(async (item) => {
      const id = `inbox_${Date.now()}`
      const full = { ...item, id, state: "pending", resolution: null, created_at: new Date().toISOString(), resolved_at: null }
      items.push(full)
      return full
    }),
    listPending: vi.fn().mockImplementation(async (sessionId?: string) => {
      return items.filter((i) => i.state === "pending" && (!sessionId || i.session_id === sessionId))
    }),
    resolve: vi.fn().mockImplementation(async (id: string, resolution: string) => {
      const item = items.find((i) => i.id === id)
      if (item && item.state === "pending") {
        item.state = "resolved"
        item.resolution = resolution
        return true
      }
      return false
    }),
    waitForResolution: vi.fn().mockResolvedValue("once"),
  } as unknown as InboxStoreAdapter

  const broadcast = {
    broadcast: vi.fn(),
    broadcastAll: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
  } as unknown as GUIBroadcastAdapter

  return { api, inbox, broadcast, items }
}

describe("ApprovalHandler", () => {
  it("creates inbox item on permission request", async () => {
    const { api, inbox, broadcast } = makeDeps()
    const handler = createApprovalHandler(api, inbox, broadcast, createLogger("error"))

    await handler.handlePermissionRequest("s1", "bash", { command: "rm -rf /" }, "perm1")

    expect(inbox.addItem).toHaveBeenCalledWith(expect.objectContaining({
      session_id: "s1",
      kind: "approval",
      title: "Run `bash`?",
    }))
    expect(broadcast.broadcast).toHaveBeenCalledWith("s1", expect.objectContaining({
      type: "permission_required",
    }))
  })

  it("responds to permission after approval", async () => {
    const { api, inbox, broadcast } = makeDeps()
    const handler = createApprovalHandler(api, inbox, broadcast, createLogger("error"))

    await handler.handlePermissionRequest("s1", "bash", {}, "perm1")

    expect(api.respondPermission).toHaveBeenCalledWith("s1", "perm1", "allow")
  })

  it("responds deny on timeout", async () => {
    const { api, inbox, broadcast } = makeDeps()
    ;(inbox.waitForResolution as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const handler = createApprovalHandler(api, inbox, broadcast, createLogger("error"))

    await handler.handlePermissionRequest("s1", "bash", {}, "perm1")

    expect(api.respondPermission).toHaveBeenCalledWith("s1", "perm1", "deny")
  })

  it("handleGUIApproval resolves first pending approval", async () => {
    const { api, inbox, broadcast, items } = makeDeps()
    const handler = createApprovalHandler(api, inbox, broadcast, createLogger("error"))

    await inbox.addItem({
      session_id: "s1",
      kind: "approval",
      title: "Test",
      body: "",
      visibility: "inline",
    })

    await handler.handleGUIApproval("s1", "once")
    expect(inbox.resolve).toHaveBeenCalled()
  })
})
