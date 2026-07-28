import { describe, it, expect, vi } from "vitest"
import { createEventBridgeHandler } from "../src/handlers/event-bridge-handler"
import { createLogger } from "../src/shared/logger"
import type { GUIBroadcastAdapter } from "../src/adapters/gui-broadcast"

describe("EventBridgeHandler", () => {
  function makeBroadcast() {
    const broadcasts: unknown[] = []
    const broadcast: GUIBroadcastAdapter = {
      register: vi.fn(),
      unregister: vi.fn(),
      broadcast: (_sid: string, event: unknown) => { broadcasts.push(event) },
      broadcastAll: vi.fn(),
    }
    return { broadcast, broadcasts }
  }

  it("converts session.status busy to turn_start", () => {
    const { broadcast, broadcasts } = makeBroadcast()
    const handler = createEventBridgeHandler(broadcast, createLogger("error"))

    handler.handleEvent("s1", {
      id: "1",
      type: "session.status",
      properties: { status: "busy" },
    })

    expect(broadcasts).toHaveLength(1)
    expect((broadcasts[0] as { type: string }).type).toBe("turn_start")
  })

  it("computes incremental text delta", () => {
    const { broadcast, broadcasts } = makeBroadcast()
    const handler = createEventBridgeHandler(broadcast, createLogger("error"))

    handler.handleEvent("s1", { id: "1", type: "message.part.updated", properties: { type: "text", text: "Hello" } })
    handler.handleEvent("s1", { id: "2", type: "message.part.updated", properties: { type: "text", text: "Hello World" } })

    const deltas = broadcasts.filter((e) => (e as { type: string }).type === "assistant_delta")
    expect(deltas).toHaveLength(2)
    expect((deltas[0] as { data: { text: string } }).data.text).toBe("Hello")
    expect((deltas[1] as { data: { text: string } }).data.text).toBe(" World")
  })

  it("converts session.idle to turn_end + turn_done", () => {
    const { broadcast, broadcasts } = makeBroadcast()
    const handler = createEventBridgeHandler(broadcast, createLogger("error"))

    handler.handleEvent("s1", { id: "1", type: "session.status", properties: { status: "busy" } })
    handler.handleEvent("s1", { id: "2", type: "session.idle", properties: {} })

    const types = broadcasts.map((e) => (e as { type: string }).type)
    expect(types).toContain("turn_end")
    expect(types).toContain("turn_done")
  })
})
