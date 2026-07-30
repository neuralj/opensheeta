import { defineStore } from "pinia"
import { ref } from "vue"
import type { HealthStatus } from "../types"
import { useAPI } from "../composables/useAPI"

export const useHealthStore = defineStore("health", () => {
  const health = ref<HealthStatus | null>(null)
  const wsConnected = ref(false)
  const loading = ref(false)

  const api = useAPI()

  const fetchHealth = async () => {
    loading.value = true
    try {
      const res = await api.getHealth()
      health.value = res.data
    } finally {
      loading.value = false
    }
  }

  return { health, wsConnected, loading, fetchHealth }
})
