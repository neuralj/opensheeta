import type { Logger } from "@/shared/logger"
import type { InboxStoreAdapter } from "@/adapters/inbox-store"
import type { GUIBroadcastAdapter } from "@/adapters/gui-broadcast"

export interface UnattendedHandler {
  setUnattended(sessionId: string, unattended: boolean): void
  isUnattended(sessionId: string): boolean
  routeInboxItem(sessionId: string, kind: string, title: string, body: string, data?: Record<string, unknown>): Promise<string>
}

export function createUnattendedHandler(
  inbox: InboxStoreAdapter,
  broadcast: GUIBroadcastAdapter,
  logger: Logger,
): UnattendedHandler {
  const log = logger.child({ component: "unattended-handler" })
  const unattendedSessions = new Set<string>()

  return {
    setUnattended(sessionId, unattended) {
      if (unattended) {
        unattendedSessions.add(sessionId)
        log.info("Session marked unattended", { sessionId })
      } else {
        unattendedSessions.delete(sessionId)
        log.info("Session marked attended", { sessionId })
      }
    },

    isUnattended(sessionId) {
      return unattendedSessions.has(sessionId)
    },

    async routeInboxItem(sessionId, kind, title, body, data) {
      const visibility = unattendedSessions.has(sessionId) ? "inbox" : "inline"

      const item = await inbox.addItem({
        session_id: sessionId,
        kind: kind as "approval" | "question" | "notification" | "directory" | "plan",
        title,
        body,
        visibility,
        data,
      })

      if (visibility === "inline") {
        broadcast.broadcast(sessionId, {
          type: "permission_required",
          data: {
            name: (data?.tool as string) ?? kind,
            arguments: (data?.arguments as Record<string, unknown>) ?? {},
            reason: body,
            category: "write",
          },
        })
      }

      return item.id
    },
  }
}
