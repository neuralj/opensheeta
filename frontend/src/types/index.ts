export type TaskStatus = "pending" | "running" | "completed" | "failed"

export interface TaskRecord {
  id: string
  directory: string
  prompt: string
  model: string
  status: TaskStatus
  agent_id?: string
  attempts: number
  max_attempts: number
  created_at: number
  updated_at: number
  error?: string
  pipeline_id?: string
  on_success?: string
  on_failure?: string
  chain_depth?: number
  max_chain_depth?: number
  parent_task_id?: string
}

export type PipelineStatus = "pending" | "running" | "completed" | "failed"
export type StageStatus = "pending" | "running" | "completed" | "failed" | "skipped"

export interface PipelineStage {
  id: string
  pipeline_id: string
  stage_index: number
  label: string
  prompt: string
  model?: string
  status: StageStatus
  task_id?: string
  error?: string
}

export interface PipelineRecord {
  id: string
  name: string
  directory: string
  status: PipelineStatus
  current_stage: number
  session_id?: string
  created_at: number
  updated_at: number
}

export interface RecurringRecord {
  id: string
  name: string
  directory: string
  prompt: string
  model: string
  cron: string
  timezone?: string
  enabled: boolean
  last_run_at?: number
}

export interface Session {
  id: string
  title: string
  parentID?: string
  time: { created: number; updated?: number }
  summary?: string
}

export interface Message {
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

export type InboxKind = "approval" | "question" | "notification" | "directory" | "plan"
export type InboxState = "pending" | "resolved"
export type InboxVisibility = "inline" | "inbox"

export interface InboxItem {
  id: string
  session_id: string
  kind: InboxKind
  title: string
  body: string
  state: InboxState
  resolution: string | null
  visibility: InboxVisibility
  created_at: string
  resolved_at: string | null
  tool_call_id?: string
  data?: Record<string, unknown>
}

export interface PersonaManifest {
  id: string
  name: string
  system_prompt: string
  family: "code" | "knowledge"
  workspace: "git" | "project" | "deliverable" | "none"
  messaging: boolean
  connectors: boolean
  default_permission_mode: "discuss" | "plan" | "interactive" | "custom" | "auto"
}

export interface ScheduledTask {
  id: string
  title: string
  instructions: string
  cron: string
  timezone: string
  workspace: string
  agent: string
  enabled: boolean
  next_run: number | null
  last_run: number | null
}

export interface AutomationRun {
  task_id: string
  run_id: string
  started_at: number
  finished_at: number | null
  status: "running" | "ok" | "error" | "skipped"
  result_text: string | null
  error: string | null
  trigger: string
  session_id: string
}

export interface AgentInfo {
  name: string
  description: string
  mode: "primary" | "subagent"
  tools?: Record<string, boolean>
  permission?: Record<string, unknown>
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  text: string
  reasoning?: string
  toolCalls?: ToolCallInfo[]
  timestamp: number
  streaming?: boolean
}

export interface ToolCallInfo {
  name: string
  args: Record<string, unknown>
  status: "proposed" | "running" | "completed" | "failed"
  result?: string
}

export interface HealthStatus {
  status: string
  mode: string
  opencode: string
  version?: string
}
