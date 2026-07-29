import { defineStore } from "pinia"
import { ref, computed } from "vue"
import type { TaskRecord, TaskStatus } from "../types"
import { useAPI } from "../composables/useAPI"
import type { TaskUpdateEvent } from "../composables/useWebSocket"

export const useTasksStore = defineStore("tasks", () => {
  const tasks = ref<TaskRecord[]>([])
  const loading = ref(false)
  const filter = ref<TaskStatus | "">("")

  const api = useAPI()

  const filteredTasks = computed(() => {
    if (!filter.value) return tasks.value
    return tasks.value.filter((t) => t.status === filter.value)
  })

  const fetchTasks = async () => {
    loading.value = true
    try {
      const res = await api.getTasks(filter.value || undefined)
      tasks.value = res.data.tasks
    } finally {
      loading.value = false
    }
  }

  const createTask = async (data: Parameters<typeof api.createTask>[0]) => {
    const res = await api.createTask(data)
    tasks.value.unshift(res.data)
    return res.data
  }

  const handleTaskUpdate = (event: TaskUpdateEvent) => {
    const index = tasks.value.findIndex((t) => t.id === event.id)
    if (index >= 0) {
      tasks.value[index] = {
        ...tasks.value[index],
        status: event.status as TaskStatus,
        error: event.error,
      }
    } else {
      fetchTasks()
    }
  }

  return {
    tasks,
    loading,
    filter,
    filteredTasks,
    fetchTasks,
    createTask,
    handleTaskUpdate,
  }
})
