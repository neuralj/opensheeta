const DAEMON_URL = process.env.OW_DAEMON_URL ?? "http://127.0.0.1:8765"

const READ_TOOLS = new Set([
  "read", "grep", "glob", "lsp", "webfetch", "websearch",
])

export const ApprovalBridgePlugin = async (ctx: { client: unknown }) => {
  return {
    "tool.execute.before": async (input: { tool: string; args: unknown }, _output: unknown) => {
      if (READ_TOOLS.has(input.tool)) return

      try {
        const resp = await fetch(`${DAEMON_URL}/v1/approval/request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: input.tool,
            args: input.args,
          }),
        })

        const result = await resp.json() as { approved: boolean; decision: string }
        if (!result.approved) {
          throw new Error(`User denied: ${input.tool}`)
        }
      } catch (err) {
        if (err instanceof TypeError && err.message.includes("fetch")) {
          return
        }
        throw err
      }
    },
  }
}

export default ApprovalBridgePlugin
