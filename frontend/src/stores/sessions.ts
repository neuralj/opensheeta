import { defineStore } from "pinia"
import { ref } from "vue"
import type { Session } from "../types"
import { useAPI } from "../composables/useAPI"

export const useSessionsStore = defineStore("sessions", () => {
  const sessions = ref<Session[]>([])
  const loading = ref(false)

  const api = useAPI()

  const fetchSessions = async () => {
    loading.value = true
    try {
      const res = await api.getSessions()
      sessions.value = res.data.sessions
    } finally {
      loading.value = false
    }
  }

  const createSession = async (title?: string) => {
    const res = await api.createSession(title ? { title } : undefined)
    sessions.value.unshift(res.data)
    return res.data
  }

  const deleteSession = async (id: string) => {
    await api.deleteSession(id)
    sessions.value = sessions.value.filter((s) => s.id !== id)
  }

  return { sessions, loading, fetchSessions, createSession, deleteSession }
})
