import type { OpenCodeAPIClient } from "@/adapters/opencode-api"
import type { Logger } from "@/shared/logger"
import type { OpenCodeSession } from "@/types/opencode"

export interface SessionHandler {
  createSession(opts?: { title?: string; workspace?: string }): Promise<OpenCodeSession>
  getSession(id: string): Promise<OpenCodeSession | null>
  listSessions(workspace?: string): Promise<OpenCodeSession[]>
  deleteSession(id: string): Promise<void>
  abortSession(id: string): Promise<void>
}

export function createSessionHandler(
  api: OpenCodeAPIClient,
  logger: Logger,
): SessionHandler {
  const log = logger.child({ component: "session-handler" })
  const sessions = new Map<string, OpenCodeSession>()

  return {
    async createSession(opts) {
      log.info("Creating session", { title: opts?.title })
      const session = await api.createSession({ title: opts?.title })
      sessions.set(session.id, session)
      log.info("Session created", { id: session.id })
      return session
    },

    async getSession(id) {
      const cached = sessions.get(id)
      if (cached) return cached
      try {
        const session = await api.getSession(id)
        sessions.set(id, session)
        return session
      } catch {
        return null
      }
    },

    async listSessions(_workspace) {
      const all = await api.listSessions()
      for (const s of all) sessions.set(s.id, s)
      return all
    },

    async deleteSession(id) {
      await api.deleteSession(id)
      sessions.delete(id)
      log.info("Session deleted", { id })
    },

    async abortSession(id) {
      await api.abortSession(id)
      log.info("Session aborted", { id })
    },
  }
}
