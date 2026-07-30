import { defineStore } from "pinia"
import { ref, computed } from "vue"
import type { InboxItem } from "../types"
import { useAPI } from "../composables/useAPI"

export const useInboxStore = defineStore("inbox", () => {
  const items = ref<InboxItem[]>([])
  const loading = ref(false)

  const api = useAPI()

  const pendingCount = computed(() => items.value.filter((i) => i.state === "pending").length)
  const approvalCount = computed(() => items.value.filter((i) => i.kind === "approval" && i.state === "pending").length)

  const fetchInbox = async (sessionId?: string) => {
    loading.value = true
    try {
      const res = await api.getInbox(sessionId)
      items.value = res.data.items
    } finally {
      loading.value = false
    }
  }

  const resolve = async (id: string, resolution: string) => {
    await api.resolveInbox(id, resolution)
    const item = items.value.find((i) => i.id === id)
    if (item) {
      item.state = "resolved"
      item.resolution = resolution
      item.resolved_at = new Date().toISOString()
    }
  }

  const addItem = (item: InboxItem) => {
    items.value.unshift(item)
  }

  return { items, loading, pendingCount, approvalCount, fetchInbox, resolve, addItem }
})
