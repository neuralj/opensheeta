const RETRY_LIMIT = 2

export const CooldownGuardPlugin = async (_ctx: { client: unknown }) => {
  if (process.env.COOLDOWN_GUARD_ENABLED === "false") {
    return {}
  }

  const retries = new Map<string, number>()

  return {
    event: async ({ event }: { event: { type?: string; properties?: Record<string, unknown> } }) => {
      if (event?.type !== "session.status") return
      const props = event.properties ?? {}
      const sid = props.sessionID as string
      const status = props.status as { type?: string } | undefined
      if (!sid || !status) return

      if (status.type === "retry") {
        const count = (retries.get(sid) ?? 0) + 1
        retries.set(sid, count)

        if (count > RETRY_LIMIT) {
          try {
            const baseUrl = process.env.OC_HOST
              ? `http://${process.env.OC_HOST}:${process.env.OC_PORT || 4096}`
              : "http://127.0.0.1:4096"
            await fetch(`${baseUrl}/session/${sid}/abort`, { method: "POST" })
          } catch { /* best effort */ }
          retries.delete(sid)
        }
      } else if (status.type === "idle") {
        retries.delete(sid)
      }
    },

    dispose: async () => {
      retries.clear()
    },
  }
}

export default CooldownGuardPlugin
