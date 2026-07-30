import { ref, onMounted, onUnmounted } from "vue"
import { useTasksStore } from "../stores/tasks"
import { useQueueStore } from "../stores/queue"
import { usePipelinesStore } from "../stores/pipelines"
import { useInboxStore } from "../stores/inbox"
import { useHealthStore } from "../stores/health"
import type { InboxItem } from "../types"

export interface TaskUpdateEvent {
  id: string
  status: string
  error?: string
  pipeline_id?: string
  stage?: number
  recurring?: string
}

export interface QueueStatusEvent {
  pending: number
  paused: boolean
  cooldowns: string[]
}

export interface PipelineUpdateEvent {
  id: string
  status: string
  stage?: number
  total?: number
}

type SessionEventHandler = (event: string, data: Record<string, unknown>) => void

const sessionEventHandlers = new Map<string, SessionEventHandler>()

export function registerSessionHandler(sessionId: string, handler: SessionEventHandler) {
  sessionEventHandlers.set(sessionId, handler)
}

export function unregisterSessionHandler(sessionId: string) {
  sessionEventHandlers.delete(sessionId)
}

export const useWebSocket = () => {
  const healthStore = useHealthStore()
  const tasksStore = useTasksStore()
  const queueStore = useQueueStore()
  const pipelinesStore = usePipelinesStore()
  const inboxStore = useInboxStore()

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const connect = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const port = window.location.port || "8765"
    const wsPort = parseInt(port) + 1
    const wsUrl = `${protocol}//${window.location.hostname}:${wsPort}/?session_id=dashboard`

    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      healthStore.wsConnected = true
    }

    ws.onclose = () => {
      healthStore.wsConnected = false
      reconnectTimer = setTimeout(connect, 3000)
    }

    ws.onerror = () => {}

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleMessage(msg)
      } catch {}
    }
  }

  const handleMessage = (msg: { type: string; data: unknown }) => {
    const data = msg.data as Record<string, unknown>
    switch (msg.type) {
      case "task_update":
        tasksStore.handleTaskUpdate(data as unknown as TaskUpdateEvent)
        break
      case "queue_status":
        queueStore.handleQueueStatus(data as unknown as QueueStatusEvent)
        break
      case "pipeline_update":
        pipelinesStore.handlePipelineUpdate(data as unknown as PipelineUpdateEvent)
        break
      case "permission_required": {
        const permData = data as unknown as { name: string; arguments: Record<string, unknown>; reason: string; category: string }
        const item: InboxItem = {
          id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          session_id: "broadcast",
          kind: "approval",
          title: `Run \`${permData.name}\`?`,
          body: JSON.stringify(permData.arguments, null, 2),
          state: "pending",
          resolution: null,
          visibility: "inline",
          created_at: new Date().toISOString(),
          resolved_at: null,
          data: permData as unknown as Record<string, unknown>,
        }
        inboxStore.addItem(item)
        break
      }
      case "ready":
      case "turn_start":
      case "assistant_delta":
      case "reasoning_delta":
      case "assistant_message":
      case "tool_proposed":
      case "tool_started":
      case "tool_finished":
      case "iteration_end":
      case "turn_end":
      case "turn_done":
      case "error":
      case "interrupted":
      case "model_changed":
      case "directory_requested":
      case "question_requested":
      case "plan_proposed":
      case "input_rejected": {
        const sessionId = data?.session_id as string
        if (sessionId) {
          const handler = sessionEventHandlers.get(sessionId)
          if (handler) handler(msg.type, data)
        }
        for (const [, handler] of sessionEventHandlers) {
          handler(msg.type, data)
        }
        break
      }
    }
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    if (ws) ws.close()
    if (reconnectTimer) clearTimeout(reconnectTimer)
  })

  return { connected: healthStore.wsConnected }
}
