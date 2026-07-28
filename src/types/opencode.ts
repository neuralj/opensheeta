export interface OpenCodeSession {
  id: string
  title: string
  parentID?: string
  time: { created: number; updated?: number }
  summary?: string
}

export interface OpenCodeMessage {
  id: string
  role: "user" | "assistant"
  parts: MessagePart[]
  metadata: {
    time: { created: number; completed?: number }
    error?: { name: string; message: string }
    sessionID: string
    assistant?: {
      modelID: string
      providerID: string
      cost: number
      tokens: { input: number; output: number; reasoning: number }
    }
  }
}

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool-invocation"; toolInvocation: ToolInvocation }
  | { type: "step-start"; step?: number }

export type ToolInvocation =
  | { state: "call"; toolCallId: string; toolName: string; args: unknown; step?: number }
  | { state: "result"; toolCallId: string; toolName: string; args: unknown; result: string; step?: number }

export interface OpenCodeSSEEvent {
  id: string
  type: string
  properties: Record<string, unknown>
}

export interface OpenCodePermission {
  id: string
  sessionID: string
  tool: string
  args: Record<string, unknown>
  status: "pending" | "resolved"
}

export interface OpenCodeAgent {
  name: string
  description: string
  mode: "primary" | "subagent"
  tools?: Record<string, boolean>
  permission?: Record<string, unknown>
}

export interface OpenCodeConfig {
  model?: { providerID: string; modelID: string }
  mcp?: Record<string, MCPServerConfig>
  agent?: Record<string, AgentConfig>
  plugin?: string[]
}

export interface MCPServerConfig {
  type: "local" | "remote"
  command?: string[]
  url?: string
  enabled?: boolean
  environment?: Record<string, string>
  timeout?: number
}

export interface AgentConfig {
  description: string
  mode: "primary" | "subagent"
  model?: string
  prompt?: string
  permission?: Record<string, unknown>
  tools?: Record<string, boolean>
  temperature?: number
  steps?: number
}
