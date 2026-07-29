import { defineStore } from "pinia"
import { ref } from "vue"
import type { RecurringRecord } from "../types"
import { useAPI } from "../composables/useAPI"

export const useRecurringStore = defineStore("recurring", () => {
  const items = ref<RecurringRecord[]>([])
  const loading = ref(false)

  const api = useAPI()

  const fetchRecurring = async () => {
    loading.value = true
    try {
      const res = await api.getRecurring()
      items.value = res.data.recurring
    } finally {
      loading.value = false
    }
  }

  const createItem = async (data: Parameters<typeof api.createRecurring>[0]) => {
    const res = await api.createRecurring(data)
    items.value.push(res.data)
    return res.data
  }

  const toggleItem = async (id: string, enabled: boolean) => {
    await api.updateRecurring(id, { enabled })
    const item = items.value.find((i) => i.id === id)
    if (item) item.enabled = enabled
  }

  const deleteItem = async (id: string) => {
    await api.deleteRecurring(id)
    items.value = items.value.filter((i) => i.id !== id)
  }

  return {
    items,
    loading,
    fetchRecurring,
    createItem,
    toggleItem,
    deleteItem,
  }
})
