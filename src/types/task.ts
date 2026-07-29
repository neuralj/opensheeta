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
