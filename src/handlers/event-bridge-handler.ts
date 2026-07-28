import type { Logger } from "@/shared/logger"
import type { GUIBroadcastAdapter } from "@/adapters/gui-broadcast"
import type { OpenCodeSSEEvent } from "@/types/opencode"
import type { OWServerEvent } from "@/types/openworker"

interface SessionState {
  prevText: string
  prevReasoning: string
  turnActive: boolean
  iterationCount: number
}

export interface EventBridgeHandler {
  handleEvent(sessionId: string, event: OpenCodeSSEEvent): void
}

export function createEventBridgeHandler(
  broadcast: GUIBroadcastAdapter,
  logger: Logger,
): EventBridgeHandler {
  const log = logger.child({ component: "event-bridge" })
  const sessionStates = new Map<string, SessionState>()

  function getState(sessionId: string): SessionState {
    let state = sessionStates.get(sessionId)
    if (!state) {
      state = { prevText: "", prevReasoning: "", turnActive: false, iterationCount: 0 }
      sessionStates.set(sessionId, state)
    }
    return state
  }

  function emit(sessionId: string, event: OWServerEvent): void {
    broadcast.broadcast(sessionId, event)
  }

  return {
    handleEvent(sessionId, event) {
      const state = getState(sessionId)

      try {
        switch (event.type) {
          case "session.status": {
            const status = event.properties.status as string
            if (status === "busy" && !state.turnActive) {
              state.turnActive = true
              state.iterationCount = 0
              emit(sessionId, { type: "turn_start", data: { input: "" } })
            }
            break
          }

          case "message.part.updated": {
            const part = event.properties as Record<string, unknown>
            const partType = part.type as string

            if (partType === "text") {
              const fullText = (part.text as string) ?? ""
              const delta = fullText.slice(state.prevText.length)
              state.prevText = fullText
              if (delta) {
                emit(sessionId, { type: "assistant_delta", data: { text: delta } })
              }
            } else if (partType === "reasoning") {
              const fullText = (part.text as string) ?? ""
              const delta = fullText.slice(state.prevReasoning.length)
              state.prevReasoning = fullText
              if (delta) {
                emit(sessionId, { type: "reasoning_delta", data: { text: delta } })
              }
            } else if (partType === "tool-invocation") {
              const invocation = part.toolInvocation as Record<string, unknown>
              if (invocation?.state === "call") {
                emit(sessionId, {
                  type: "tool_proposed",
                  data: {
                    name: invocation.toolName as string,
                    arguments: (invocation.args as Record<string, unknown>) ?? {},
                  },
                })
              }
            }
            break
          }

          case "permission.asked": {
            const perm = event.properties as Record<string, unknown>
            emit(sessionId, {
              type: "permission_required",
              data: {
                name: (perm.tool as string) ?? "unknown",
                arguments: (perm.args as Record<string, unknown>) ?? {},
                reason: "",
                category: "write",
              },
            })
            break
          }

          case "tool.execute.before": {
            const tool = event.properties as Record<string, unknown>
            emit(sessionId, { type: "tool_started", data: { name: (tool.tool as string) ?? "" } })
            break
          }

          case "tool.execute.after": {
            const tool = event.properties as Record<string, unknown>
            const result = (tool.result as string) ?? ""
            emit(sessionId, {
              type: "tool_finished",
              data: {
                name: (tool.tool as string) ?? "",
                status: "ok",
                result_preview: result.slice(0, 500),
              },
            })
            state.iterationCount++
            emit(sessionId, { type: "iteration_end", data: { iteration: state.iterationCount } })
            break
          }

          case "session.idle": {
            if (state.turnActive) {
              state.turnActive = false
              emit(sessionId, {
                type: "assistant_message",
                data: { text: state.prevText, tool_calls: [] },
              })
              emit(sessionId, {
                type: "turn_end",
                data: { status: "completed", iterations: state.iterationCount },
              })
              emit(sessionId, { type: "turn_done", data: {} })
              state.prevText = ""
              state.prevReasoning = ""
            }
            break
          }

          case "session.error": {
            const err = event.properties as Record<string, unknown>
            emit(sessionId, {
              type: "error",
              data: {
                error: (err.message as string) ?? "Unknown error",
                error_type: (err.name as string) ?? "Error",
              },
            })
            break
          }
        }
      } catch (err) {
        log.error("Event bridge error", { sessionId, eventType: event.type, error: String(err) })
      }
    },
  }
}
