import type { WebSocket } from "ws"
import type { Logger } from "@/shared/logger"
import type { OWServerEvent } from "@/types/openworker"

export interface GUIBroadcastAdapter {
  register(sessionId: string, ws: WebSocket): void
  unregister(sessionId: string): void
  broadcast(sessionId: string, event: OWServerEvent): void
  broadcastAll(event: OWServerEvent): void
}

export function createGUIBroadcast(logger: Logger): GUIBroadcastAdapter {
  const log = logger.child({ component: "gui-broadcast" })
  const connections = new Map<string, Set<WebSocket>>()

  return {
    register(sessionId, ws) {
      if (!connections.has(sessionId)) connections.set(sessionId, new Set())
      connections.get(sessionId)!.add(ws)
      log.debug("Connection registered", { sessionId })
    },

    unregister(sessionId) {
      connections.delete(sessionId)
      log.debug("Connection unregistered", { sessionId })
    },

    broadcast(sessionId, event) {
      const sockets = connections.get(sessionId)
      if (!sockets) return
      const payload = JSON.stringify(event)
      for (const ws of sockets) {
        if (ws.readyState === ws.OPEN) {
          ws.send(payload)
        }
      }
    },

    broadcastAll(event) {
      const payload = JSON.stringify(event)
      for (const [, sockets] of connections) {
        for (const ws of sockets) {
          if (ws.readyState === ws.OPEN) {
            ws.send(payload)
          }
        }
      }
    },
  }
}
