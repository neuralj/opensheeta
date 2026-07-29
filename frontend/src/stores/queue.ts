import { defineStore } from "pinia"
import { ref } from "vue"
import { useAPI } from "../composables/useAPI"
import type { QueueStatusEvent } from "../composables/useWebSocket"

export const useQueueStore = defineStore("queue", () => {
  const pending = ref(0)
  const paused = ref(false)
  const cooldowns = ref<string[]>([])

  const api = useAPI()

  const handleQueueStatus = (event: QueueStatusEvent) => {
    pending.value = event.pending
    paused.value = event.paused
    cooldowns.value = event.cooldowns
  }

  const pause = async () => {
    await api.controlQueue("pause")
    paused.value = true
  }

  const resume = async () => {
    await api.controlQueue("resume")
    paused.value = false
  }

  return {
    pending,
    paused,
    cooldowns,
    handleQueueStatus,
    pause,
    resume,
  }
})
