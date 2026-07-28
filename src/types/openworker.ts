export type OWServerEvent =
  | { type: "ready"; data: OWReadyData }
  | { type: "turn_start"; data: { input: string; source?: OWMessageSource } }
  | { type: "assistant_delta"; data: { text: string } }
  | { type: "reasoning_delta"; data: { text: string } }
  | { type: "assistant_message"; data: { text: string; tool_calls: string[]; reasoning?: string } }
  | { type: "tool_proposed"; data: { name: string; arguments: Record<string, unknown> } }
  | { type: "permission_required"; data: { name: string; arguments: Record<string, unknown>; reason: string; category: string; standing_target?: string } }
  | { type: "directory_requested"; data: { reason: string; path: string; writable: boolean } }
  | { type: "question_requested"; data: { question: string; options: string[]; allow_text: boolean; multi: boolean; header: string } }
  | { type: "plan_proposed"; data: { plan: string } }
  | { type: "tool_started"; data: { name: string } }
  | { type: "tool_finished"; data: { name: string; status: string; result_preview: string; reason?: string; standing_rule?: string } }
  | { type: "iteration_end"; data: { iteration: number } }
  | { type: "turn_end"; data: { status: string; iterations: number } }
  | { type: "turn_done"; data: Record<string, never> }
  | { type: "error"; data: { error: string; error_type: string; raw?: string } }
  | { type: "interrupted"; data: { iterations: number } }
  | { type: "input_rejected"; data: { error: string } }
  | { type: "model_changed"; data: { model: string; text: string } }

export interface OWReadyData {
  session_id: string
  agent: string
  model: string
  mode: string
  workspace: string | null
  command_trust?: {
    workspace: string
    requested_commands: string[]
    trusted: boolean
    required: boolean
    exists: boolean
  }
}

export interface OWMessageSource {
  connector: string
  kind: "channel" | "dm"
  channel_id: string
  channel_name: string
  sender_id: string
  sender_name: string
  ts: number
  text: string
}

export type OWClientMessage =
  | { type: "user_message"; text: string; model?: string; attachments?: OWAttachment[] }
  | { type: "approval"; decision: string }
  | { type: "directory_response"; granted: boolean; path: string; writable: boolean }
  | { type: "plan_response"; approved: boolean; mode: string; feedback?: string }
  | { type: "question_response"; answer: string }
  | { type: "interrupt" }
  | { type: "retry" }
  | { type: "set_mode"; mode: string }
  | { type: "set_model"; model: string }

export interface OWAttachment {
  kind: "image" | "pdf" | "text"
  name: string
  mime?: string
  data_url?: string
  text?: string
}

export interface OWInboxItem {
  id: string
  session_id: string
  kind: "approval" | "question" | "notification" | "directory" | "plan"
  title: string
  body: string
  state: "pending" | "resolved"
  resolution: string | null
  visibility: "inline" | "inbox"
  created_at: string
  resolved_at: string | null
  tool_call_id?: string
  data?: Record<string, unknown>
}
