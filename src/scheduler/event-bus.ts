import { EventEmitter } from "node:events"

export interface TaskEventPayload {
  id: string
  status: string
  error?: string
  pipeline_id?: string
  stage?: number
  recurring?: string
}

export interface StatusEventPayload {
  pending?: number
  paused?: boolean
  cooldowns?: string[]
  offline?: boolean
  task_id?: string
  pipeline?: { id: string; status: string; stage?: number; total?: number }
}

export class EventBus extends EventEmitter {
  emitTask(payload: TaskEventPayload): void {
    this.emit("task", payload)
  }

  emitStatus(payload: StatusEventPayload): void {
    this.emit("status", payload)
  }
}
