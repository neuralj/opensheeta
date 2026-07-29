import { ref, onMounted, onUnmounted } from "vue"
import { useTasksStore } from "../stores/tasks"
import { useQueueStore } from "../stores/queue"
import { usePipelinesStore } from "../stores/pipelines"

export interface TaskUpdateEvent {
  id: string
  status: string
  error?: string
  pipeline_id?: string
  stage?: number
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

export const useWebSocket = () => {
  const connected = ref(false)
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const tasksStore = useTasksStore()
  const queueStore = useQueueStore()
  const pipelinesStore = usePipelinesStore()

  const connect = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const port = window.location.port || "8765"
    const wsPort = parseInt(port) + 1
    const wsUrl = `${protocol}//${window.location.hostname}:${wsPort}/?session_id=dashboard`

    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      connected.value = true
    }

    ws.onclose = () => {
      connected.value = false
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

  const handleMessage = (msg: any) => {
    switch (msg.type) {
      case "task_update":
        tasksStore.handleTaskUpdate(msg.data as TaskUpdateEvent)
        break
      case "queue_status":
        queueStore.handleQueueStatus(msg.data as QueueStatusEvent)
        break
      case "pipeline_update":
        pipelinesStore.handlePipelineUpdate(msg.data as PipelineUpdateEvent)
        break
    }
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    if (ws) ws.close()
    if (reconnectTimer) clearTimeout(reconnectTimer)
  })

  return { connected }
}
