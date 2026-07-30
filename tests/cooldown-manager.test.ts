import { describe, it, expect, vi } from "vitest"
import { createCooldownManager } from "../src/scheduler/cooldown-manager"
import { createLogger } from "../src/shared/logger"
import type { OpenCodeAPIClient } from "../src/adapters/opencode-api"

function makeMockApi(): OpenCodeAPIClient {
  return {
    health: vi.fn().mockResolvedValue({ healthy: true, version: "1.0" }),
    createSession: vi.fn(),
    getSession: vi.fn(),
    deleteSession: vi.fn(),
    listSessions: vi.fn(),
    abortSession: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue({ id: "m1", role: "assistant", parts: [], metadata: { time: { created: 0 }, sessionID: "s1" } }),
    sendMessageAsync: vi.fn().mockResolvedValue(undefined),
    getMessages: vi.fn().mockResolvedValue([]),
    respondPermission: vi.fn(),
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    listAgents: vi.fn(),
    subscribeEvents: vi.fn(),
  } as unknown as OpenCodeAPIClient
}

describe("CooldownManager", () => {
  it("tracks cooldown agents", () => {
    const api = makeMockApi()
    const controls = { pause: vi.fn(), resume: vi.fn() }
    const manager = createCooldownManager(api, controls, 60000, createLogger("error"))

    expect(manager.has("agent1")).toBe(false)
    manager.add("agent1")
    expect(manager.has("agent1")).toBe(true)
    expect(controls.pause).toHaveBeenCalled()
  })

  it("returns cooldown list", () => {
    const api = makeMockApi()
    const controls = { pause: vi.fn(), resume: vi.fn() }
    const manager = createCooldownManager(api, controls, 60000, createLogger("error"))

    manager.add("agent1")
    manager.add("agent2")
    expect(manager.getCooldowns()).toEqual(["agent1", "agent2"])
  })

  it("ignores empty agent id", () => {
    const api = makeMockApi()
    const controls = { pause: vi.fn(), resume: vi.fn() }
    const manager = createCooldownManager(api, controls, 60000, createLogger("error"))

    manager.add("")
    expect(manager.getCooldowns()).toHaveLength(0)
  })

  it("stops and clears all cooldowns", () => {
    const api = makeMockApi()
    const controls = { pause: vi.fn(), resume: vi.fn() }
    const manager = createCooldownManager(api, controls, 60000, createLogger("error"))

    manager.add("agent1")
    manager.stop()
    expect(manager.getCooldowns()).toHaveLength(0)
  })

  it("sets recovery config", () => {
    const api = makeMockApi()
    const controls = { pause: vi.fn(), resume: vi.fn() }
    const manager = createCooldownManager(api, controls, 60000, createLogger("error"))

    manager.setRecoveryConfig("agent1", "continue please")
    expect(manager.has("agent1")).toBe(false)
  })
})
