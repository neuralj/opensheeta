import type { Logger } from "@/shared/logger"
import type { OpenCodeAPIClient } from "@/adapters/opencode-api"
import type { InboxStoreAdapter } from "@/adapters/inbox-store"
import type { GUIBroadcastAdapter } from "@/adapters/gui-broadcast"

export interface ApprovalHandler {
  handlePermissionRequest(sessionId: string, tool: string, args: Record<string, unknown>, permissionId: string): Promise<void>
  handleGUIApproval(sessionId: string, decision: string): Promise<void>
}

export function createApprovalHandler(
  api: OpenCodeAPIClient,
  inbox: InboxStoreAdapter,
  broadcast: GUIBroadcastAdapter,
  logger: Logger,
): ApprovalHandler {
  const log = logger.child({ component: "approval-handler" })

  return {
    async handlePermissionRequest(sessionId, tool, args, permissionId) {
      log.info("Permission request received", { sessionId, tool, permissionId })

      const item = await inbox.addItem({
        session_id: sessionId,
        kind: "approval",
        title: `Run \`${tool}\`?`,
        body: JSON.stringify(args, null, 2),
        visibility: "inline",
        tool_call_id: permissionId,
        data: { tool, arguments: args, permissionId },
      })

      broadcast.broadcast(sessionId, {
        type: "permission_required",
        data: {
          name: tool,
          arguments: args,
          reason: "",
          category: "write",
        },
      })

      const resolution = await inbox.waitForResolution(item.id)
      if (!resolution) {
        log.warn("Approval timed out", { itemId: item.id })
        await api.respondPermission(sessionId, permissionId, "deny")
        return
      }

      const mapped = mapResolution(resolution)
      log.info("Approval resolved", { itemId: item.id, resolution: mapped })
      await api.respondPermission(sessionId, permissionId, mapped)
    },

    async handleGUIApproval(sessionId, decision) {
      const pending = await inbox.listPending(sessionId)
      const first = pending.find((i) => i.kind === "approval")
      if (!first) {
        log.warn("No pending approval for session", { sessionId })
        return
      }
      await inbox.resolve(first.id, decision)
    },
  }
}

function mapResolution(decision: string): string {
  switch (decision) {
    case "once":
    case "allow":
      return "allow"
    case "always_tool":
    case "always":
      return "allow"
    case "deny":
      return "deny"
    default:
      return "deny"
  }
}
