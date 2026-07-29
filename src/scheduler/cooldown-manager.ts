import type { OpenCodeAPIClient } from "@/adapters/opencode-api"
import type { Logger } from "@/shared/logger"

export interface CooldownControls {
  pause(): void
  resume(): void
}

export interface CooldownManager {
  has(agentId: string): boolean
  getCooldowns(): string[]
  setRecoveryConfig(agentId: string, prompt: string): void
  add(agentId: string): void
  stop(): void
}

export function createCooldownManager(
  api: OpenCodeAPIClient,
  controls: CooldownControls,
  pingIntervalMs: number,
  logger: Logger,
  defaultModel = "",
): CooldownManager {
  const log = logger.child({ component: "cooldown-manager" })
  const aborted = new Map<string, { until: number }>()
  const recoveryConfigs = new Map<string, string>()
  let probeTimer: ReturnType<typeof setInterval> | null = null

  function startProbe(): void {
    if (probeTimer) return
    const tick = async (): Promise<void> => {
      const agents = [...aborted.keys()]
      if (agents.length === 0) {
        stopProbe()
        return
      }
      const aid = agents[0]
      try {
        await api.sendMessage(aid, {
          parts: [{ type: "text", text: "only ping" }],
          ...(defaultModel ? parseModel(defaultModel) : {}),
        })
        await resumeAll()
      } catch {
        // network error: wait for next tick
      }
    }
    probeTimer = setInterval(tick, pingIntervalMs)
  }

  function stopProbe(): void {
    if (probeTimer) {
      clearInterval(probeTimer)
      probeTimer = null
    }
  }

  async function resumeAll(): Promise<void> {
    const agents = [...aborted.keys()]
    for (const aid of agents) {
      const prompt = recoveryConfigs.get(aid) || "继续"
      try {
        await api.sendMessageAsync(aid, {
          parts: [{ type: "text", text: prompt }],
          ...(defaultModel ? parseModel(defaultModel) : {}),
        })
      } catch {
        // recovery prompt failed: ignore, continue with others
      }
    }
    aborted.clear()
    stopProbe()
    controls.resume()
    log.info("Cooldown recovered all agents", { count: agents.length })
  }

  function parseModel(model: string): { model?: { providerID: string; modelID: string } } {
    const parts = model.split("/")
    if (parts.length === 2) return { model: { providerID: parts[0], modelID: parts[1] } }
    return { model: { providerID: "", modelID: model } }
  }

  return {
    has(agentId: string) {
      return aborted.has(agentId)
    },

    getCooldowns() {
      return [...aborted.keys()]
    },

    setRecoveryConfig(agentId: string, prompt: string) {
      if (agentId) recoveryConfigs.set(agentId, prompt)
    },

    add(agentId: string) {
      if (!agentId) return
      aborted.set(agentId, { until: Date.now() + pingIntervalMs })
      controls.pause()
      startProbe()
      log.warn("Agent entered cooldown", { agentId, pingIntervalMs })
    },

    stop() {
      stopProbe()
      aborted.clear()
    },
  }
}
