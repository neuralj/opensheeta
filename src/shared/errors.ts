export class DaemonError extends Error {
  constructor(message: string, public readonly code: string, public readonly retryable: boolean = false) {
    super(message)
    this.name = "DaemonError"
  }
}

export class OpenCodeProcessError extends DaemonError {
  constructor(message: string, public readonly exitCode?: number) {
    super(message, "OPENCODE_PROCESS_ERROR", false)
    this.name = "OpenCodeProcessError"
  }
}

export class OpenCodeAPIError extends DaemonError {
  constructor(message: string, public readonly status: number, public readonly body?: string) {
    super(message, "OPENCODE_API_ERROR", status >= 500)
    this.name = "OpenCodeAPIError"
  }
}

export class ApprovalTimeoutError extends DaemonError {
  constructor(itemId: string) {
    super(`Approval timed out for item ${itemId}`, "APPROVAL_TIMEOUT", true)
    this.name = "ApprovalTimeoutError"
  }
}

export class MCPConnectionError extends DaemonError {
  constructor(serverName: string, cause?: Error) {
    super(`MCP server '${serverName}' connection failed: ${cause?.message ?? "unknown"}`, "MCP_CONNECTION_ERROR", true)
    this.name = "MCPConnectionError"
  }
}
