import axios from "axios"
import type { TaskRecord, PipelineRecord, PipelineStage, RecurringRecord } from "../types"

const api = axios.create({
  baseURL: "",
  timeout: 30000,
})

export interface TaskChainInfo {
  task: TaskRecord
  parent: TaskRecord | null
  children: TaskRecord[]
}

export const useAPI = () => {
  return {
    getHealth: () => api.get<{ status: string; mode: string }>("/health"),

    getTasks: (status?: string) =>
      api.get<{ tasks: TaskRecord[] }>("/v1/tasks", { params: { status } }),
    getTask: (id: string) => api.get<TaskRecord>(`/v1/tasks/${id}`),
    createTask: (data: {
      prompt: string
      directory?: string
      model?: string
      on_success?: string
      on_failure?: string
      max_chain_depth?: number
    }) => api.post<TaskRecord>("/v1/tasks", data),
    abortTask: (id: string) => api.post(`/v1/tasks/${id}/abort`),
    retryTask: (id: string) => api.post(`/v1/tasks/${id}/retry`),
    getTaskChain: (id: string) => api.get<TaskChainInfo>(`/v1/tasks/${id}/chain`),

    controlQueue: (action: "pause" | "resume") =>
      api.post<{ paused: boolean }>("/v1/queue", { action }),

    getPipelines: () =>
      api.get<{ pipelines: (PipelineRecord & { stages: PipelineStage[] })[] }>("/v1/pipelines"),
    getPipeline: (id: string) =>
      api.get<PipelineRecord & { stages: PipelineStage[] }>(`/v1/pipelines/${id}`),
    createPipeline: (data: {
      name?: string
      directory?: string
      stages: { prompt: string; model?: string; label?: string }[]
    }) => api.post<PipelineRecord>("/v1/pipelines", data),
    abortPipeline: (id: string) => api.post(`/v1/pipelines/${id}/abort`),
    deletePipeline: (id: string) => api.delete(`/v1/pipelines/${id}`),

    getRecurring: () => api.get<{ recurring: RecurringRecord[] }>("/v1/recurring"),
    createRecurring: (data: {
      name: string
      directory?: string
      prompt: string
      cron: string
      model?: string
      timezone?: string
      enabled?: boolean
    }) => api.post<RecurringRecord>("/v1/recurring", data),
    updateRecurring: (id: string, data: Partial<RecurringRecord>) =>
      api.put<RecurringRecord>(`/v1/recurring/${id}`, data),
    deleteRecurring: (id: string) => api.delete(`/v1/recurring/${id}`),

    getAgents: () => api.get<{ agents: any[] }>("/v1/agents"),
  }
}
