import { defineStore } from "pinia"
import { ref } from "vue"
import type { PipelineRecord, PipelineStage } from "../types"
import { useAPI } from "../composables/useAPI"
import type { PipelineUpdateEvent } from "../composables/useWebSocket"

export const usePipelinesStore = defineStore("pipelines", () => {
  const pipelines = ref<(PipelineRecord & { stages: PipelineStage[] })[]>([])
  const loading = ref(false)

  const api = useAPI()

  const fetchPipelines = async () => {
    loading.value = true
    try {
      const res = await api.getPipelines()
      pipelines.value = res.data.pipelines
    } finally {
      loading.value = false
    }
  }

  const handlePipelineUpdate = (event: PipelineUpdateEvent) => {
    const index = pipelines.value.findIndex((p) => p.id === event.id)
    if (index >= 0) {
      pipelines.value[index] = {
        ...pipelines.value[index],
        status: event.status as PipelineRecord["status"],
        current_stage: event.stage ?? pipelines.value[index].current_stage,
      }
    }
  }

  return {
    pipelines,
    loading,
    fetchPipelines,
    handlePipelineUpdate,
  }
})
